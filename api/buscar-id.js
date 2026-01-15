export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "ID obrigatório" });

  try {
    // 1️⃣ GERA TOKEN (SEM ENV!)
    const authResp = await fetch(`${req.headers.origin}/api/auth`);
    const auth = await authResp.json();

    if (!auth.accessToken) {
      return res.status(500).json({ error: "Token não gerado" });
    }

    // 2️⃣ CHAMA VAREJO FÁCIL
    const url = `https://villachopp.varejofacil.com/api/v1/produto/produtos?q=id==${id}&start=0&count=1`;

    const response = await fetch(url, {
      headers: {
        Authorization: auth.accessToken,
        Accept: "application/json"
      }
    });

    const text = await response.text();

    if (!response.ok) {
      return res.status(response.status).json({ error: "Erro produto", raw: text });
    }

    return res.status(200).json(JSON.parse(text));

  } catch (err) {
    return res.status(500).json({
      error: "Erro interno buscar-id",
      message: err.message
    });
  }
}
