export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    if (!req.body) {
      return res.status(400).json({ error: "Body vazio" });
    }

    const { requisicao, novoStatus, vf_token } = req.body;

    if (!requisicao || !novoStatus || !vf_token) {
      return res.status(400).json({
        error: "requisicao, novoStatus e vf_token são obrigatórios"
      });
    }

    if (novoStatus === "ENTREGUE" && !requisicao.produto_id_vf) {
      return res.status(400).json({
        error: "produto_id_vf não informado"
      });
    }

    const headersVF = {
      "Authorization": `Bearer ${vf_token}`,
      "Content-Type": "application/json",
      "Accept": "application/json"
    };

    // =====================================================
    // 🟢 ENTREGUE → CRIAR REQUISIÇÃO NO VAREJO FÁCIL
    // =====================================================
    if (novoStatus === "ENTREGUE" && !requisicao.vf_requisicao_id) {

      // 1️⃣ CRIA A REQUISIÇÃO (CABEÇALHO)
      const respReq = await fetch(
        "https://villachopp.varejofacil.com/api/v1/estoque/requisicoes",
        {
          method: "POST",
          headers: headersVF,
          body: JSON.stringify({
            id: 0,
            tipo: "TRANSFERENCIA",
            modelo: "DIRETA",
            lojaId: requisicao.loja_id,
            localOrigemId: requisicao.local_origem_id,
            localDestinoId: requisicao.local_destino_id,
            setorId: requisicao.setor_id,
            solicitanteId: requisicao.solicitante_id,
            motivoRequisicaoId: requisicao.motivo_requisicao_id,
            observacaoGeral: requisicao.observacao_geral || "REGISTRO VIA API"
          })
        }
      );

      const reqText = await respReq.text();

      if (!respReq.ok) {
        return res.status(respReq.status).json({
          error: "Erro ao criar requisição (cabeçalho)",
          raw: reqText
        });
      }

      const reqJson = JSON.parse(reqText);
      const requisicaoVFId = reqJson.id;

      // 2️⃣ ADICIONA OS ITENS
      const custo = Number(requisicao.custo) || 0.01;

      const respItens = await fetch(
        "https://villachopp.varejofacil.com/api/v1/estoque/requisicoes-mercadorias",
        {
          method: "POST",
          headers: headersVF,
          body: JSON.stringify({
            requisicaoId: requisicaoVFId,
            itens: [
              {
                produtoId: requisicao.produto_id_vf,
                quantidadeTransferida: requisicao.quantidade,
                observacao: requisicao.observacoes || "",
                custoMedio: custo,
                custo: custo,
                custoReposicao: custo,
                custoFiscal: custo
              }
            ]
          })
        }
      );

      const itensText = await respItens.text();

      if (!respItens.ok) {
        return res.status(respItens.status).json({
          error: "Erro ao inserir itens na requisição",
          vf_requisicao_id: requisicaoVFId,
          raw: itensText
        });
      }

      return res.status(200).json({
        acao: "CRIADA",
        vf_requisicao_id: requisicaoVFId
      });
    }

    // =====================================================
    // 🔴 ESTORNO (ENTREGUE → OUTRO STATUS)
    // =====================================================
    if (
      requisicao.status === "ENTREGUE" &&
      novoStatus !== "ENTREGUE" &&
      requisicao.vf_requisicao_id
    ) {
      const delResp = await fetch(
        `https://villachopp.varejofacil.com/api/v1/estoque/requisicoes/${requisicao.vf_requisicao_id}`,
        {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${vf_token}`,
            "Accept": "application/json"
          }
        }
      );

      if (!delResp.ok) {
        const delText = await delResp.text();
        return res.status(delResp.status).json({
          error: "Erro ao estornar requisição no Varejo Fácil",
          raw: delText
        });
      }

      return res.status(200).json({ acao: "ESTORNADA" });
    }

    // =====================================================
    // ⚪ NENHUMA AÇÃO
    // =====================================================
    return res.status(200).json({ acao: "NENHUMA" });

  } catch (err) {
    console.error("ERRO requisicao-sync:", err);
    return res.status(500).json({
      error: "Erro interno",
      message: err.message
    });
  }
}
