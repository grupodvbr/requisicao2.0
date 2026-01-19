import fetch from "node-fetch";

/**
 * CONFIGURAÇÕES
 */
const VF_BASE_URL = "https://villachopp.varejofacil.com/api";
const VF_USUARIO = process.env.VF_USUARIO;
const VF_SENHA = process.env.VF_SENHA;

/**
 * AUTENTICAÇÃO NO VAREJO FÁCIL
 */
async function autenticarVF() {
  const response = await fetch(`${VF_BASE_URL}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      usuario: VF_USUARIO,
      senha: VF_SENHA
    })
  });

  if (!response.ok) {
    const erro = await response.text();
    throw new Error(`Falha na autenticação VF: ${erro}`);
  }

  const data = await response.json();

  if (!data?.token) {
    throw new Error("Token VF não retornado");
  }

  return data.token;
}

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
 * ESTORNAR / EXCLUIR REQUISIÇÃO NO VF
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
 * HANDLER PRINCIPAL
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const {
      status,
      statusAnterior,
      requisicaoVFId,
      produto,
      quantidade,
      unidade,
      observacao
    } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status não informado" });
    }

    const token = await autenticarVF();

    /**
     * CASO: MARCAR COMO ENTREGUE
     */
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

    /**
     * CASO: VOLTAR DE ENTREGUE (ESTORNO)
     */
    if (statusAnterior === "ENTREGUE" && requisicaoVFId) {
      await estornarRequisicaoVF(token, requisicaoVFId);

      return res.status(200).json({
        success: true,
        action: "ESTORNADO"
      });
    }

    /**
     * OUTROS STATUS (APENAS LOCAL)
     */
    return res.status(200).json({
      success: true,
      action: "STATUS_LOCAL"
    });

  } catch (error) {
    console.error("❌ ERRO requisicao-sync:", error.message);

    return res.status(500).json({
      error: "Erro interno",
      message: error.message
    });
  }
}
