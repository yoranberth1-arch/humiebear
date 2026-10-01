export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  try {
    const apiKey = process.env.MOLLIE_API_KEY;
    if (!apiKey) {
      return res.status(500).send("MOLLIE_API_KEY is not configured.");
    }

    const paymentId = req.body?.id || req.query?.id;
    if (!paymentId) {
      return res.status(400).send("Missing payment id");
    }

    const response = await fetch(
      "https://api.mollie.com/v2/payments/" + encodeURIComponent(paymentId),
      {
        headers: {
          "Authorization": "Bearer " + apiKey,
          "Accept": "application/json"
        }
      }
    );

    const payment = await response.json();

    if (!response.ok) {
      console.error("Mollie webhook lookup error:", payment);
      return res.status(response.status || 500).send("Could not retrieve payment");
    }

    console.log("Hummie Bear Mollie payment:", {
      id: payment.id,
      status: payment.status,
      amount: payment.amount,
      metadata: payment.metadata
    });

    return res.status(200).send("OK");
  } catch (error) {
    console.error("Mollie webhook error:", error);
    return res.status(500).send("Webhook error");
  }
}
