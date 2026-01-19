/**
 * BASE VF
 */
const VF_BASE_URL = "https://villachopp.varejofacil.com/api";

/**
 * CRIAR REQUISIÇÃO NO VF
 */
async function criarRequisicaoVF(token, payload) {
  const response = await fetch(`${VF_BASE_URL}/requisicoes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const erro = await response.text();
    throw new Error(`Erro ao criar requisição VF: ${erro}`);
  }

  return response.json();
}

/**
 * ESTORNAR REQUISIÇÃO
 */
async function estornarRequisicaoVF(token, requisicaoId) {
  const response = await fetch(
    `${VF_BASE_URL}/requisicoes/${requisicaoId}`,
    {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    const erro = await response.text();
    throw new Error(`Erro ao estornar requisição VF: ${erro}`);
  }

  return true;
}

/**
 * HANDLER
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const {
      token,               // 👈 TOKEN JÁ AUTENTICADO
      status,
      statusAnterior,
      requisicaoVFId,
      produto,
      quantidade,
      unidade,
      observacao
    } = req.body;

    if (!token) {
      return res.status(401).json({ error: "Token não informado" });
    }

    // ✅ ENTREGUE → cria no VF
    if (status === "ENTREGUE") {
      const payload = {
        observacao: observacao || "Requisição via sistema",
        itens: [
          {
            descricao: produto,
            quantidade: Number(quantidade),
            unidade: unidade || "UN"
          }
        ]
      };

      const requisicao = await criarRequisicaoVF(token, payload);

      return res.status(200).json({
        success: true,
        action: "CRIADO",
        requisicaoVFId: requisicao.id
      });
    }

    // 🔄 VOLTOU DE ENTREGUE → estorna
    if (statusAnterior === "ENTREGUE" && requisicaoVFId) {
      await estornarRequisicaoVF(token, requisicaoVFId);

      return res.status(200).json({
        success: true,
        action: "ESTORNADO"
      });
    }

    // ℹ️ OUTROS STATUS
    return res.status(200).json({
      success: true,
      action: "STATUS_LOCAL"
    });

  } catch (err) {
    console.error("❌ ERRO requisicao-sync:", err.message);

    return res.status(500).json({
      error: "Erro interno",
      message: err.message
    });
  }
}
