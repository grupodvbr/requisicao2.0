export const config = {
  runtime: "edge"
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
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

    // 🟢 CRIAR NO VAREJO FÁCIL
    if (novoStatus === "ENTREGUE" && !requisicao.vf_requisicao_id) {

      const custo = Number(requisicao.custo) || 0.01;

      const payloadVF = {
        id: 0,
        dataTransferencia: new Date().toISOString(),
        dataRecebimento: new Date().toISOString(),
        tipo: "TRANSFERENCIA",
        status: "RECEBIDA",
        modelo: "DIRETA",
        lojaId: requisicao.loja_id,
        localOrigemId: requisicao.local_origem_id,
        localDestinoId: requisicao.local_destino_id,
        setorId: requisicao.setor_id,
        solicitanteId: requisicao.solicitante_id,
        motivoRequisicaoId: requisicao.motivo_requisicao_id,
        observacaoGeral: requisicao.observacao_geral || "REGISTRO VIA API",
        total: 0,
        itens: [
          {
            id: 0,
            produtoId: requisicao.produto_id_vf,
            quantidadeTransferida: requisicao.quantidade,
            observacao: requisicao.observacoes || "",
            custoMedio: custo,
            custo: custo,
            custoReposicao: custo,
            custoFiscal: custo
          }
        ]
      };

      const vfResp = await fetch(
        "https://villachopp.varejofacil.com/api/v1/estoque/requisicoes-mercadorias",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${vf_token}`,
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(payloadVF)
        }
      );

      const vfText = await vfResp.text();

      if (!vfResp.ok) {
        return res.status(vfResp.status).json({
          error: "Erro Varejo Fácil",
          raw: vfText
        });
      }

      const vfJson = JSON.parse(vfText);

      return res.status(200).json({
        acao: "CRIADA",
        vf_requisicao_id: vfJson.id
      });
    }

    // 🔴 ESTORNO
    if (
      requisicao.status === "ENTREGUE" &&
      novoStatus !== "ENTREGUE" &&
      requisicao.vf_requisicao_id
    ) {
      await fetch(
        `https://villachopp.varejofacil.com/api/v1/estoque/requisicoes-mercadorias/${requisicao.vf_requisicao_id}`,
        {
          method: "DELETE",
          headers: {
            "Authorization": `${vf_token}`,
            "Accept": "application/json"
          }
        }
      );

      return res.status(200).json({ acao: "ESTORNADA" });
    }

    return res.status(200).json({ acao: "NENHUMA" });

  } catch (err) {
    console.error("ERRO requisicao-sync:", err);
    return res.status(500).json({
      error: "Erro interno",
      message: err.message
    });
  }
}
