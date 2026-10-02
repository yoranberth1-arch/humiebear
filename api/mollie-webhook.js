
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).send("Method not allowed");
  }

  try {
    const apiKey = process.env.MOLLIE_API_KEY;

    if (!apiKey) {
      console.error("MOLLIE_API_KEY is not configured");
      return res.status(500).send("Server configuration error");
    }

    // Parse classic form payloads as well as JSON payloads.
    let body = req.body;

    if (typeof body === "string") {
      const params = new URLSearchParams(body);
      body = Object.fromEntries(params.entries());
    }

    if (Buffer.isBuffer(body)) {
      const params = new URLSearchParams(body.toString("utf8"));
      body = Object.fromEntries(params.entries());
    }

    if (!body || typeof body !== "object") {
      body = {};
    }

    // Classic webhook: id = tr_...
    // Next-gen event: entityId = tr_... (or embedded entity)
    let paymentId;

    if (body.resource === "event" || String(body.id || "").startsWith("event_")) {
      paymentId =
        body.entityId ||
        body._embedded?.entity?.id;
    } else {
      paymentId = body.id;
    }

    paymentId = paymentId || req.query?.id;

    if (
      typeof paymentId !== "string" ||
      !/^tr_[A-Za-z0-9]+$/.test(paymentId)
    ) {
      console.error("Invalid or missing Mollie payment ID");
      return res.status(400).send("Missing or invalid payment ID");
    }

    // Always fetch the real payment status from Mollie.
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

    const payment = await response.json();

    if (!response.ok) {
      console.error("Mollie payment lookup failed:", {
        status: response.status,
        paymentId
      });
      return res.status(502).send("Could not verify payment");
    }

    console.log("Hummie Bear Mollie payment:", {
      id: payment.id,
      status: payment.status,
      amount: payment.amount,
      metadata: payment.metadata
    });

    // Acknowledge successful delivery.
    // Order storage and customer emails are not implemented here yet.
    return res.status(200).send("OK");
  } catch (error) {
    console.error("Mollie webhook error:", error);
    return res.status(500).send("Webhook error");
  }
}
