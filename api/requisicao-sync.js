// pages/api/requisicao-sync.js

/**
 * AUTENTICA NO VAREJO FÁCIL (API V1)
 */
async function gerarTokenVF() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Usuario>
  <username>NALBERT SOUZA</username>
  <password>99861</password>
</Usuario>`;

  const resp = await fetch(
    "https://villachopp.varejofacil.com/api/v1/auth",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/xml",
        "Accept": "application/json"
      },
      body: xml
    }
  );

  const raw = await resp.text();

  console.log("VF AUTH STATUS:", resp.status);
  console.log("VF AUTH RAW:", raw);

  if (!resp.ok) {
    throw new Error("Falha na autenticação VF");
  }

  const json = JSON.parse(raw);

  if (!json.accessToken) {
    throw new Error("Token VF não retornado");
  }

  return json.accessToken;
}

/**
 * HANDLER PRINCIPAL
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const { requisicao, novoStatus } = req.body;

    if (!requisicao || !novoStatus) {
      return res.status(400).json({
        error: "requisicao e novoStatus são obrigatórios"
      });
    }

    if (novoStatus === "ENTREGUE" && !requisicao.produto_id_vf) {
      return res.status(400).json({
        error: "produto_id_vf não informado"
      });
    }

    // 🔐 TOKEN VF (BACKEND)
    const vf_token = await gerarTokenVF();

    const headersVF = {
      "Authorization": `${vf_token}`,
      "Content-Type": "application/json",
      "Accept": "application/json"
    };

    /**
     * =====================================================
     * 🟢 ENTREGUE → CRIAR REQUISIÇÃO NO VF
     * =====================================================
     */
    if (novoStatus === "ENTREGUE" && !requisicao.vf_requisicao_id) {

      console.log("CRIANDO REQUISIÇÃO VF...");

      // 1️⃣ CABEÇALHO
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

      const reqRaw = await respReq.text();
      console.log("REQ VF STATUS:", respReq.status);
      console.log("REQ VF RAW:", reqRaw);

      if (!respReq.ok) {
        return res.status(respReq.status).json({
          error: "Erro ao criar requisição (cabeçalho)",
          raw: reqRaw
        });
      }

      const reqJson = JSON.parse(reqRaw);
      const requisicaoVFId = reqJson.id;

      // 2️⃣ ITENS
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

      const itensRaw = await respItens.text();
      console.log("ITENS VF STATUS:", respItens.status);
      console.log("ITENS VF RAW:", itensRaw);

      if (!respItens.ok) {
        return res.status(respItens.status).json({
          error: "Erro ao inserir itens na requisição",
          vf_requisicao_id: requisicaoVFId,
          raw: itensRaw
        });
      }

      return res.status(200).json({
        acao: "CRIADA",
        vf_requisicao_id: requisicaoVFId
      });
    }

    /**
     * =====================================================
     * 🔴 ESTORNO
     * =====================================================
     */
    if (
      requisicao.status === "ENTREGUE" &&
      novoStatus !== "ENTREGUE" &&
      requisicao.vf_requisicao_id
    ) {
      console.log("ESTORNANDO REQUISIÇÃO VF...");

      const delResp = await fetch(
        `https://villachopp.varejofacil.com/api/v1/estoque/requisicoes/${requisicao.vf_requisicao_id}`,
        {
          method: "DELETE",
          headers: {
            "Authorization": `${vf_token}`,
            "Accept": "application/json"
          }
        }
      );

      const delRaw = await delResp.text();
      console.log("DEL VF STATUS:", delResp.status);
      console.log("DEL VF RAW:", delRaw);

      if (!delResp.ok) {
        return res.status(delResp.status).json({
          error: "Erro ao estornar requisição",
          raw: delRaw
        });
      }

      return res.status(200).json({ acao: "ESTORNADA" });
    }

    /**
     * =====================================================
     * ⚪ NENHUMA AÇÃO
     * =====================================================
     */
    return res.status(200).json({ acao: "NENHUMA" });

  } catch (err) {
    console.error("ERRO GERAL VF:", err);
    return res.status(500).json({
      error: "Erro interno",
      message: err.message
    });
  }
}
