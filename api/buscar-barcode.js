export default async function handler(req, res) {
  const { barcode } = req.query;

  if (!barcode) {
    return res.status(400).json({ error: "Barcode não informado" });
  }

  try {
    /* =====================================================
       1️⃣ MONTA URL ABSOLUTA CORRETA
    ===================================================== */
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers.host;
    const baseUrl = `${protocol}://${host}`;

    console.log("BASE URL:", baseUrl);

    /* =====================================================
       2️⃣ OBTÉM TOKEN (URL ABSOLUTA)
    ===================================================== */
    const authUrl = `${baseUrl}/api/auth`;
    console.log("AUTH URL:", authUrl);

    const authResp = await fetch(authUrl);
    const authRaw = await authResp.text();

    console.log("AUTH STATUS:", authResp.status);
    console.log("AUTH RAW:", authRaw);

    if (!authResp.ok) {
      return res.status(401).json({
        error: "Erro ao autenticar",
        raw: authRaw
      });
    }

    const authJson = JSON.parse(authRaw);
    const token = authJson.accessToken;

    if (!token) {
      return res.status(401).json({ error: "Token não retornado" });
    }

    /* =====================================================
       3️⃣ BUSCA CÓDIGO AUXILIAR (EAN)
       ⚠️ ID DO EAN = BARCODE
    ===================================================== */
    const urlCodigo =
      `https://villachopp.varejofacil.com/api/v1/produto/codigos-auxiliares` +
      `?q=id==${barcode}&start=0&count=1`;

    console.log("BUSCANDO EAN:", urlCodigo);

    const codigoResp = await fetch(urlCodigo, {
      headers: {
        Authorization: token,
        Accept: "application/json"
      }
    });

    const codigoRaw = await codigoResp.text();

    console.log("EAN STATUS:", codigoResp.status);
    console.log("EAN RAW:", codigoRaw);

    if (!codigoResp.ok) {
      return res.status(codigoResp.status).json({
        error: "Erro ao buscar código auxiliar",
        raw: codigoRaw
      });
    }

    const codigoJson = JSON.parse(codigoRaw);

    if (!codigoJson.items || !codigoJson.items.length) {
      return res.status(404).json({
        error: "Código de barras não encontrado",
        barcode
      });
    }

    const produtoId = codigoJson.items[0].produtoId;
    console.log("PRODUTO ID:", produtoId);

    /* =====================================================
       4️⃣ BUSCA PRODUTO COMPLETO
    ===================================================== */
    const urlProduto =
      `https://villachopp.varejofacil.com/api/v1/produto/produtos/${produtoId}`;

    console.log("BUSCANDO PRODUTO:", urlProduto);

    const produtoResp = await fetch(urlProduto, {
      headers: {
        Authorization: token,
        Accept: "application/json"
      }
    });

    const produtoRaw = await produtoResp.text();

    console.log("PRODUTO STATUS:", produtoResp.status);
    console.log("PRODUTO RAW:", produtoRaw);

    if (!produtoResp.ok) {
      return res.status(produtoResp.status).json({
        error: "Erro ao buscar produto",
        raw: produtoRaw
      });
    }

    const produtoJson = JSON.parse(produtoRaw);

    /* =====================================================
       5️⃣ RETORNO FINAL
    ===================================================== */
    return res.status(200).json({
      barcode,
      produtoId,
      produto: produtoJson
    });

  } catch (err) {
    console.error("ERRO GERAL:", err);
    return res.status(500).json({
      error: "Erro interno busca barcode",
      message: err.message
    });
  }
}
