const PRODUCT_IDS = new Set(["spek-lardons","bananen","berries","carensac","frambooshartjes","fruitkogels","gloeiwormen","goudbeertjes","grapefruit","happy-cola-groot","happy-cola-klein","kersen","krokodillen","letters","pasta-frutta","perziken","pico-balla","reuze-aardbei","rotella-fruit","rotella-zwart-jojo","schuimaardbei-tacada","smurfen","tutters-spenen","blue-dummies-sour","bubblegum-bottles","bubblegum-tutters","chery-cola","cola-tutten-zuur","cola-klein-zuur","confetti","eieren","frieten","gesuikerde-aardbei","hearts","hotlips","kersen-zuur","kikkers-astra","manneke-pis-zuur","manneke-pis-olie","muizen","orka","poepekens","unicones","violetten","watermeloen-tutters","winegums","zure-appeltjes","zure-beren","zure-gloeiewormen","zure-ringen","zwarte-muizen","cuberdons","zure-vliegers","spaghetti-aardbei","spaghetti-appel","spaghetti-cola","matten-aardbei","matten-cola","matten-appel","creamrolls","dracula","dracula-zuur","tropical-fish","kettingen"]);
const DEALS = {
  "deal-sweet-500": { grams: 500, cents: 795 },
  "deal-sweet-1000": { grams: 1000, cents: 1590 },
  "deal-sweet-1500": { grams: 1500, cents: 2375 },
  "deal-sweet-2000": { grams: 2000, cents: 3150 },
  "deal-sour-500": { grams: 500, cents: 795 },
  "deal-sour-1000": { grams: 1000, cents: 1590 },
  "deal-sour-1500": { grams: 1500, cents: 2375 },
  "deal-sour-2000": { grams: 2000, cents: 3150 },
  "deal-mix-500": { grams: 500, cents: 795 },
  "deal-mix-1000": { grams: 1000, cents: 1590 },
  "deal-mix-1500": { grams: 1500, cents: 2375 },
  "deal-mix-2000": { grams: 2000, cents: 3150 }
};
const BAG_SIZES = new Set([300, 500, 750, 1000]);
const GIFT_BOX_SIZES = new Set([250, 500, 750, 1000]);

function validGrams(value) {
  return Number.isSafeInteger(value) && value >= 100 && value <= 10000 && value % 100 === 0;
}

function calculateOrder(items) {
  if (!Array.isArray(items) || items.length === 0 || items.length > 30) {
    throw new Error("De bestelling is leeg of bevat te veel regels.");
  }

  const normalized = [];
  let subtotalCents = 0;

  for (const item of items) {
    const quantity = item?.quantity;
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 50) {
      throw new Error("Ongeldig aantal in de bestelling.");
    }

    let grams;
    let unitCents;
    let type = "product";
    let mix = [];

    if (Array.isArray(item.customMix)) {
      const meta = item.meta || {};
      type = meta.type;
      if (item.customMix.length === 0 || item.customMix.length > 64) {
        throw new Error("Ongeldige snoepmix.");
      }

      if (type === "deal") {
        const part = item.customMix[0];
        const deal = DEALS[part?.id];
        if (item.customMix.length !== 1 || !deal || part.grams !== deal.grams) {
          throw new Error("Ongeldige snoepbox.");
        }
        grams = deal.grams;
        unitCents = deal.cents;
        mix = [{ id: part.id, grams: part.grams }];
      } else if (type === "gift-box") {
        const size = meta.size;
        const part = item.customMix[0];
        if (item.customMix.length !== 1 || part?.id !== "gift-box" ||
            !GIFT_BOX_SIZES.has(size) || part.grams !== size) {
          throw new Error("Ongeldige snoepdoos.");
        }
        grams = size;
        unitCents = 350 + (size / 100) * 170;
        mix = [{ id: "gift-box", grams: size }];
      } else if (type === "personalized-bag" || type === "pickmix") {
        mix = item.customMix.map(part => {
          if (!PRODUCT_IDS.has(part?.id) || !validGrams(part?.grams)) {
            throw new Error("Ongeldige snoepsoort of gewicht.");
          }
          return { id: part.id, grams: part.grams };
        });
        grams = mix.reduce((sum, part) => sum + part.grams, 0);
        if (type === "personalized-bag" &&
            (!BAG_SIZES.has(meta.size) || grams !== meta.size)) {
          throw new Error("De snoepzak heeft geen geldig formaat of gewicht.");
        }
        unitCents = (grams / 100) * 170;
      } else {
        throw new Error("Onbekend type gepersonaliseerd product.");
      }
    } else {
      if (!PRODUCT_IDS.has(item?.id) || !validGrams(item?.grams)) {
        throw new Error("Ongeldig product of gewicht.");
      }
      grams = item.grams;
      unitCents = (grams / 100) * 170;
    }

    subtotalCents += unitCents * quantity;
    normalized.push({ type, quantity, grams, unitCents, mix });
  }

  const shippingCents = subtotalCents >= 5500 ? 0 : 595;
  return {
    totalCents: subtotalCents + shippingCents,
    metadataItems: normalized.map(({ type, quantity, grams, unitCents, mix }) => ({
      type, quantity, grams, unit_price_cents: unitCents, mix
    }))
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://www.hummiebear.be");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.MOLLIE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "MOLLIE_API_KEY is not configured." });
    }

    const { items } = req.body || {};
    let order;
    try {
      order = calculateOrder(items);
    } catch (validationError) {
      return res.status(400).json({ error: validationError.message || "Ongeldige bestelling." });
    }

    const origin = "https://www.hummiebear.be";
    const orderId = "HB-" + Date.now();

    const payment = await fetch("https://api.mollie.com/v2/payments", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        amount: {
          currency: "EUR",
          value: (order.totalCents / 100).toFixed(2)
        },
        description: "Hummie Bear webshop bestelling",
        redirectUrl: origin + "/payment-success.html?order=" + encodeURIComponent(orderId),
        cancelUrl: origin + "/payment-cancelled.html?order=" + encodeURIComponent(orderId),
        webhookUrl: "https://humiebear.vercel.app/api/mollie-webhook",
        metadata: {
          order_id: orderId,
          items: order.metadataItems
        }
      })
    });

    const data = await payment.json();

    if (!payment.ok) {
      console.error("Mollie create payment error:", data);
      return res.status(payment.status || 500).json({
        error: data.detail || "Mollie kon de betaling niet aanmaken."
      });
    }

    return res.status(200).json({
      id: data.id,
      checkoutUrl: data._links?.checkout?.href || null,
      status: data.status,
      orderId
    });
  } catch (error) {
    console.error("Create payment error:", error);
    return res.status(500).json({ error: "Er ging iets mis bij het starten van de betaling." });
  }
}
