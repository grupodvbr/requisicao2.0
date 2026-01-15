export default async function handler(req, res) {
  const { id } = req.query;
  const authHeader = req.headers.authorization;

  if (!id) {
    return res.status(400).json({ error: "ID obrigatório" });
  }

  if (!authHeader) {
    return res.status(401).json({ error: "Token não enviado" });
  }

  try {
    const url = `https://villachopp.varejofacil.com/api/v1/produto/produtos?q=id==${id}&start=0&count=1`;

    console.log("URL PRODUTO:", url);
    console.log("AUTH HEADER:", authHeader);

    const response = await fetch(url, {
      headers: {
        Authorization: authHeader,
        Accept: "application/json"
      }
    });

    const text = await response.text();

    console.log("STATUS PRODUTO:", response.status);
    console.log("PRODUTO RAW:", text);

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Erro ao buscar produto",
        raw: text
      });
    }

    return res.status(200).json(JSON.parse(text));

  } catch (err) {
    return res.status(500).json({
      error: "Erro interno produto",
      message: err.message
    });
  }
}
