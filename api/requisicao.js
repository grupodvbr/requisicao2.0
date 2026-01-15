
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const authResp = await fetch(`${process.env.BASE_URL}/api/auth`);
    const auth = await authResp.json();

    console.log("TOKEN:", auth.accessToken);

    const body = req.body;
    console.log("BODY RECEBIDO:", body);

    const resp = await fetch(
      "https://villachopp.varejofacil.com/api/v1/estoque/requisicoes-mercadorias",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: auth.accessToken
        },
        body: JSON.stringify(body)
      }
    );

    const text = await resp.text();
    console.log("REQUISIÇÃO RAW:", text);

    if (!resp.ok) {
      return res.status(resp.status).json({
        error: "Erro ao registrar requisição",
        raw: text
      });
    }

    return res.status(201).json(JSON.parse(text));

  } catch (err) {
    return res.status(500).json({
      error: "Erro interno requisição",
      message: err.message
    });
  }
}
