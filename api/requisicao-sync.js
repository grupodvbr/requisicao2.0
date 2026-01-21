export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { token, requisicao, novoStatus } = req.body;

    if (!token) {
      return res.status(401).json({ error: "Token VF não informado" });
    }

    // 🔒 Só sincroniza com VF quando for ENTREGUE
    if (novoStatus !== "ENTREGUE") {
      return res.status(200).json({
        acao: "status_local",
        message: "Status não exige sincronização com VF"
      });
    }

    // 🧠 PAYLOAD EXATAMENTE NO PADRÃO DO SWAGGER
    const payload = {
      id: 0,
      dataTransferencia: new Date().toISOString().substring(0, 10),
      dataRecebimento: new Date().toISOString().substring(0, 10),
      tipo: "TRANSFERENCIA",
      status: "RECEBIDA",
      modelo: "DIRETA",
      lojaId: 1,
      localOrigemId: 1,
      localDestinoId: 1,
      setorId: requisicao.setor_id || 1,
      solicitanteId: requisicao.usuario_id || 1,
      motivoRequisicaoId: 1,
      observacaoGeral: requisicao.observacoes || "",
      total: 0,
      itens: [
        {
          id: 0,
          quantidadeTransferida: Number(requisicao.quantidade),
          observacao: requisicao.observacoes || "",
          produtoId: requisicao.produto_id_vf,
          custoMedio: 0,
          custo: 0,
          custoReposicao: 0,
          custoFiscal: 0
        }
      ]
    };

    console.log("VF PAYLOAD:", JSON.stringify(payload, null, 2));

    const response = await fetch(
      "https://villachopp.varejofacil.com/api/v1/estoque/requisicoes-mercadorias",
      {
        method: "POST",
        headers: {
          "Authorization": `${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    const raw = await response.text();

    console.log("VF STATUS:", response.status);
    console.log("VF RAW:", raw);

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Erro ao criar requisição no Varejo Fácil",
        raw,
        payload
      });
    }

    const json = JSON.parse(raw);

    return res.status(200).json({
      acao: "entregue",
      vf_requisicao_id: json.id,
      vf_payload: json
    });

  } catch (err) {
    console.error("REQUISICAO SYNC ERROR:", err);
    return res.status(500).json({
      error: "Erro interno requisição-sync",
      message: err.message
    });
  }
}
