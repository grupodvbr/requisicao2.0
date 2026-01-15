export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "ID obrigatório" });

  try {
    const authResp = await fetch(`${process.env.BASE_URL}/api/auth`);
    const auth = await authResp.json();

    const url = `https://villachopp.varejofacil.com/api/v1/produto/produtos/${id}`;

    const resp = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: auth.accessToken
      }
    });

    const text = await resp.text();
    if (!resp.ok) {
      return res.status(resp.status).json({ error: "Erro produto", raw: text });
    }

    return res.status(200).json(JSON.parse(text));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
