export default async function handler(req, res) {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: "Busca obrigatória" });
  }

  try {
    // 🔑 monta baseUrl corretamente
    const baseUrl = req.headers.host.includes("localhost")
      ? "http://localhost:3000"
      : `https://${req.headers.host}`;

    // 🔐 AUTH
    const authResp = await fetch(`${baseUrl}/api/auth`);
    const authText = await authResp.text();

    console.log("AUTH RAW:", authText);

    const auth = JSON.parse(authText);
    if (!auth.accessToken) {
      return res.status(401).json({ error: "Token não retornado" });
    }

    const url = `https://villachopp.varejofacil.com/api/v1/produto/produtos?q=descricao==*${q}*&start=0&count=20`;

    console.log("BUSCA URL:", url);

    const resp = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: auth.accessToken
      }
    });

    const raw = await resp.text();
    console.log("BUSCA RAW:", raw);

    if (!resp.ok) {
      return res.status(resp.status).json({
        error: "Erro interno busca",
        raw
      });
    }

    return res.status(200).json(JSON.parse(raw));

  } catch (err) {
    return res.status(500).json({
      error: "Erro interno busca",
      message: err.message
    });
  }
}
