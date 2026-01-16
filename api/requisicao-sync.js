export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const {
      requisicao,   // registro COMPLETO do Supabase
      novoStatus
    } = req.body;

    if (!requisicao || !novoStatus) {
      return res.status(400).json({ error: "Dados incompletos" });
    }

    // 🔹 CASO 1: MARCOU COMO ENTREGUE → CRIA NO VAREJO
    if (novoStatus === "ENTREGUE" && !requisicao.vf_requisicao_id) {

      const payloadVF = {
        id: 0,
        dataTransferencia: new Date().toISOString(),
        dataRecebimento: new Date().toISOString(),

        tipo: "TRANSFERENCIA",
        status: "RECEBIDA",
        modelo: "DIRETA",

        lojaId: 2,
        localOrigemId: 20,
        localDestinoId: 31,

        setorId: 2,
        solicitanteId: 72,
        motivoRequisicaoId: 1,

        observacaoGeral: "REGISTRO VIA API - CB SYSTEMS",

        total: 0,

        itens: [
          {
            id: 0,
            produtoId: requisicao.produto_id_vf,
            quantidadeTransferida: requisicao.quantidade,
            observacao: "REGISTRO VIA API - CB SYSTEMS",
            custoMedio: 0,
            custo: 0,
            custoReposicao: 0,
            custoFiscal: 0
          }
        ]
      };

      // 🔐 AUTH
      const authResp = await fetch(`${process.env.BASE_URL}/api/auth`);
      const auth = await authResp.json();

      if (!auth.accessToken) {
        return res.status(401).json({ error: "Erro auth VF" });
      }

      // 🚀 ENVIA PARA O VAREJO FÁCIL
      const vfResp = await fetch(
        "https://villachopp.varejofacil.com/api/v1/estoque/requisicoes-mercadorias",
        {
          method: "POST",
          headers: {
            Authorization: auth.accessToken,
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify(payloadVF)
        }
      );

      const vfText = await vfResp.text();

      if (!vfResp.ok) {
        return res.status(vfResp.status).json({
          error: "Erro ao criar requisição VF",
          raw: vfText
        });
      }

      const vfJson = JSON.parse(vfText);

      return res.status(200).json({
        acao: "CRIADA",
        vf_requisicao_id: vfJson.id
      });
    }

    // 🔹 CASO 2: SAIU DE ENTREGUE → ESTORNA
    if (
      requisicao.status === "ENTREGUE" &&
      novoStatus !== "ENTREGUE" &&
      requisicao.vf_requisicao_id
    ) {
      const authResp = await fetch(`${process.env.BASE_URL}/api/auth`);
      const auth = await authResp.json();

      await fetch(
        `https://villachopp.varejofacil.com/api/v1/estoque/requisicoes-mercadorias/${requisicao.vf_requisicao_id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: auth.accessToken,
            Accept: "application/json"
          }
        }
      );

      return res.status(200).json({
        acao: "ESTORNADA"
      });
    }

    return res.status(200).json({ acao: "NENHUMA" });

  } catch (err) {
    return res.status(500).json({
      error: "Erro interno",
      message: err.message
    });
  }
}
