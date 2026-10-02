
export default async function handler(req, res) {
  // Mollie sends webhook notifications using POST.
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).send("Method not allowed");
  }

  try {
    // Read the API key from Vercel environment variables.
    const apiKey = process.env.MOLLIE_API_KEY;

    if (!apiKey) {
      console.error("MOLLIE_API_KEY is not configured");
      return res.status(500).send("Server configuration error");
    }

    // Parse form-encoded, JSON, or Buffer request bodies.
    let body = req.body;

    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = Object.fromEntries(new URLSearchParams(body).entries());
      }
    }

    if (Buffer.isBuffer(body)) {
      const rawBody = body.toString("utf8");
      try {
        body = JSON.parse(rawBody);
      } catch {
        body = Object.fromEntries(new URLSearchParams(rawBody).entries());
      }
    }

    if (!body || typeof body !== "object") {
      body = {};
    }

    // Mollie's webhook connectivity test does not contain a payment ID.
    // Acknowledge it separately so it doesn't return a 400 error.
    if (
      body.type === "hook.ping" ||
      body.eventType === "hook.ping"
    ) {
      console.log("Mollie webhook ping received");
      return res.status(200).send("OK");
    }

    // Support classic Mollie webhooks and event-style payloads.
    let paymentId;

    if (
      body.resource === "event" ||
      String(body.id || "").startsWith("event_") ||
      (typeof body.type === "string" && body.type.startsWith("payment."))
    ) {
      paymentId =
        body.entityId ||
        body._embedded?.entity?.id ||
        body.data?.id;
    } else {
      paymentId = body.id;
    }

    // Support a payment ID supplied as a query parameter.
    paymentId = paymentId || req.query?.id;

    // Mollie payment IDs normally begin with tr_.
    if (
      typeof paymentId !== "string" ||
      !/^tr_[A-Za-z0-9]+$/.test(paymentId)
    ) {
      console.error("Missing or invalid Mollie payment ID");
      return res.status(400).send("Missing or invalid payment ID");
    }

    // Verify the actual payment status directly with Mollie.
    const response = await fetch(
      "https://api.mollie.com/v2/payments/" +
        encodeURIComponent(paymentId),
      {
        method: "GET",
        headers: {
          Authorization: "Bearer " + apiKey,
          Accept: "application/json"
        }
      }
    );

    if (!response.ok) {
      console.error("Mollie payment lookup failed:", {
        status: response.status,
        paymentId
      });
      return res.status(502).send("Could not verify payment");
    }

    const payment = await response.json();

    console.log("Hummie Bear Mollie payment:", {
      id: payment.id,
      status: payment.status,
      amount: payment.amount,
      metadata: payment.metadata
    });

    // Acknowledge the webhook after successfully checking the payment.
    // Note: this code does not yet save orders or send customer emails.
    return res.status(200).send("OK");

  } catch (error) {
    console.error("Mollie webhook error:", error);
    return res.status(500).send("Webhook error");
  }
}
