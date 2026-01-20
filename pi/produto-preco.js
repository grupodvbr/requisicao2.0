export default async function handler(req, res) {
  const { produtoId } = req.query;

  if (!produtoId) {
    return res.status(400).json({ error: "produtoId obrigatório" });
  }

  try {
    /* ===== AUTH (reutiliza a que você já tem) ===== */
    const baseUrl = req.headers.host.includes("localhost")
      ? "http://localhost:3000"
      : `https://${req.headers.host}`;

    const authResp = await fetch(`${baseUrl}/api/auth`);
    const auth = await authResp.json();

    if (!auth.accessToken) {
      return res.status(401).json({ error: "Token não retornado" });
    }

    /* ===== CHAMADA VAREJO FÁCIL ===== */
    const url = `https://villchopp.varejofacil.com/api/v1/produto/precos?q=produtoId==${produtoId}&start=0&count=1`;

    const resp = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: auth.accessToken
      }
    });

    const raw = await resp.text();

    if (!resp.ok) {
      return res.status(resp.status).json({
        error: "Erro ao buscar preço",
        raw
      });
    }

    return res.status(200).json(JSON.parse(raw));

  } catch (err) {
    return res.status(500).json({
      error: "Erro interno produto-preco",
      message: err.message
    });
  }
}
