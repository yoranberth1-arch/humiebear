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

    const { amount, description, items } = req.body || {};
    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: "Ongeldig bedrag." });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "De bestelling is leeg." });
    }

    const origin = process.env.PUBLIC_SITE_URL || "https://www.hummiebear.be";
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
          value: numericAmount.toFixed(2)
        },
        description: String(description || "Hummie Bear webshop bestelling").slice(0, 255),
        redirectUrl: origin + "/payment-success.html?order=" + encodeURIComponent(orderId),
        cancelUrl: origin + "/payment-cancelled.html?order=" + encodeURIComponent(orderId),
        webhookUrl: origin + "/api/mollie-webhook",
        metadata: {
          order_id: orderId,
          items: items
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
