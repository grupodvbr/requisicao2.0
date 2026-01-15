export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "ID obrigatório" });

  try {
    // 1. gera token
    const authResp = await fetch(`${process.env.BASE_URL}/api/auth`);
    const auth = await authResp.json();

    // 2. chama varejo fácil
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
    return res.status(500).json({ error: err.message });
  }
}
