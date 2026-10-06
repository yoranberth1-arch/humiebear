const ALLOWED_HOSTS = new Set([
  "www.snoepzoet.be",
  "snoepstore.nl",
  "www.notesgourmandes.fr",
  "cdn.webshopapp.com",
  "candyparadis.org",
  "media.s-bol.com",
  "fladis.azureedge.net",
  "assets.haribo.com",
  "assets.sainsburys-groceries.co.uk",
  "www.snoepaanhuis.be",
  "www.bbi-kermesse.com",
  "static.delhaize.be",
  "www.ccandy.de",
  "www.dropgigant.nl",
  "i0.wp.com",
  "www-static.snoeppotteke.be",
  "ollebolle.net",
  "despekke-lendelede.be",
  "lekkergoed.be",
  "www.mijnsnoepgoed.nl",
  "odoo.snoepcenterlingier.be",
  "hurikan.hr",
  "www.belices.be",
  "files.candyandmore.be",
  "www.gosupps.com",
  "www.rigato.net",
  "soyouz2.deindeal.ch",
  "www.aligro.ch",
  "cbonbons.ch",
  "www.shopbelgium.net",
  "www.ah.nl"
]);

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const rawUrl = typeof req.query?.url === "string" ? req.query.url : "";
    if (!rawUrl) return res.status(400).json({ error: "Missing image URL" });

    const target = new URL(rawUrl);
    if (!["http:", "https:"].includes(target.protocol) || !ALLOWED_HOSTS.has(target.hostname)) {
      return res.status(403).json({ error: "Image host not allowed" });
    }

    const upstream = await fetch(target.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; HummieBearImageProxy/1.0)",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
      }
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: "Upstream image unavailable" });
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    if (!contentType.toLowerCase().startsWith("image/")) {
      return res.status(415).json({ error: "Upstream resource is not an image" });
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.status(200).send(buffer);
  } catch (error) {
    console.error("image-proxy error", error);
    return res.status(500).json({ error: "Image proxy failed" });
  }
};
