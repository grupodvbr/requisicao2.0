export default async function handler(req, res) {
  const { produtoId } = req.query;

  if (!produtoId) {
    return res.status(400).json({ error: "produtoId obrigatório" });
  }

  try {
    /* ======================================================
       BASE URL (LOCAL / PROD)
    ====================================================== */
    const baseUrl = req.headers.host.includes("localhost")
      ? "http://localhost:3000"
      : `https://${req.headers.host}`;

    /* ======================================================
       AUTH (REAPROVEITA O QUE JÁ EXISTE)
    ====================================================== */
    const authResp = await fetch(`${baseUrl}/api/auth`);
    const auth = await authResp.json();

    if (!auth.accessToken) {
      return res.status(401).json({ error: "Token VF não obtido" });
    }

    const headers = {
      Accept: "application/json",
      Authorization: auth.accessToken
    };

    /* ======================================================
       PRODUTO
    ====================================================== */
    const produtoResp = await fetch(
      `https://villchopp.varejofacil.com/api/v1/produto/produtos?q=id==${produtoId}`,
      { headers }
    );

    const produtoJson = await produtoResp.json();
    const produto = produtoJson.items?.[0];

    if (!produto) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    /* ======================================================
       PREÇOS / CUSTOS
    ====================================================== */
    const precosResp = await fetch(
      `https://villchopp.varejofacil.com/api/v1/produto/precos?q=produtoId==${produtoId}&start=0&count=1`,
      { headers }
    );

    const precosJson = await precosResp.json();
    const precos = precosJson.items?.[0] || {};

    /* ======================================================
       NORMALIZA (SEM ERRO)
    ====================================================== */
    const precoVenda =
      precos.precoVenda1 ??
      precos.precoVenda2 ??
      precos.precoVenda3 ??
      0;

    const custoProduto =
      precos.custoProduto ??
      precos.precoMedioDeReposicao ??
      precos.precoFiscalDeReposicao ??
      0;

    return res.status(200).json({
      produto: {
        id: produto.id,
        nome: produto.descricao,
        unidade: produto.unidadeDeVenda
      },
      preco: {
        venda: precoVenda,
        oferta: precos.precoOferta1 || null,
        margem: precos.margemPreco1 || null
      },
      custo: {
        custoProduto,
        custoReposicao: precos.precoMedioDeReposicao || null,
        custoFiscal: precos.precoFiscalDeReposicao || null
      },
      origem: precos.origem
    });

  } catch (err) {
    return res.status(500).json({
      error: "Erro interno",
      message: err.message
    });
  }
}
