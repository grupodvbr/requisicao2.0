export default async function handler(req, res) {
  const { produtoId } = req.query;

  if (!produtoId) {
    return res.status(400).json({ error: "produtoId obrigatório" });
  }

  try {
    const baseUrl = req.headers.host.includes("localhost")
      ? "http://localhost:3000"
      : `https://${req.headers.host}`;

    // 🔐 AUTH
    const authResp = await fetch(`${baseUrl}/api/auth`);
    const auth = await authResp.json();

    if (!auth.accessToken) {
      return res.status(401).json({ error: "Token não retornado" });
    }

    // 🔥 IMPORTANTE: lojaId OBRIGATÓRIO
    const LOJA_ID = 2;

    const url =
      `https://villchopp.varejofacil.com/api/v1/produto/precos` +
      `?q=produtoId==${produtoId};lojaId==${LOJA_ID}` +
      `&start=0&count=5`;

    const resp = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: auth.accessToken
      }
    });

    const raw = await resp.text();

    if (!resp.ok) {
      return res.status(resp.status).json({
        error: "Erro VF",
        raw
      });
    }

    return res.status(200).json(JSON.parse(raw));

  } catch (err) {
    return res.status(500).json({
      error: "Erro interno",
      message: err.message
    });
  }
}
