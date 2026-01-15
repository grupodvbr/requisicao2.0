export default async function handler(req, res) {
  try {
    // XML EXATAMENTE IGUAL AO POSTMAN
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Usuario>
  <username>NALBERT SOUZA</username>
  <password>99861</password>
</Usuario>`;

    const response = await fetch(
      "https://villachopp.varejofacil.com/api/auth",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/xml",
          "Accept": "application/json"
        },
        body: xml
      }
    );

    const raw = await response.text();

    // DEBUG TOTAL
    console.log("AUTH STATUS:", response.status);
    console.log("AUTH RAW:", raw);

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Erro ao autenticar",
        raw
      });
    }

    const json = JSON.parse(raw);

    return res.status(200).json({
      accessToken: json.accessToken,
      refreshToken: json.refreshToken,
      expiresIn: 1800
    });

  } catch (err) {
    return res.status(500).json({
      error: "Erro interno auth",
      message: err.message
    });
  }
}
