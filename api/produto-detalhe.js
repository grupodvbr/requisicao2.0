export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) return res.status(400).json({ error: "ID obrigatório" });

  try {
    const authResp = await fetch(`${process.env.BASE_URL}/api/auth`);
    const auth = await authResp.json();

    const url = `https://villachopp.varejofacil.com/api/v1/produto/produtos/${id}`;

    console.log("DETALHE URL:", url);

    const resp = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: auth.accessToken
      }
    });

    const text = await resp.text();
    console.log("DETALHE RAW:", text);

    if (!resp.ok) {
      return res.status(resp.status).json({ error: "Erro detalhe", raw: text });
    }

    return res.status(200).json(JSON.parse(text));

  } catch (err) {
    return res.status(500).json({
      error: "Erro interno detalhe",
      message: err.message
    });
  }
}
