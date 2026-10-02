export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  try {
    const apiKey = process.env.MOLLIE_API_KEY;
    if (!apiKey) {
      return res.status(500).send("MOLLIE_API_KEY is not configured.");
    }

    // Classic Mollie webhooks send a form field named "id" (tr_...).
    // Next-gen webhooks send an event snapshot (event_...) with entityId.
    // Resolve the payment ID, then always verify the actual payment with Mollie's API.
    let body = req.body;
    if (typeof body === "string") {
      const params = new URLSearchParams(body);
      body = Object.fromEntries(params.entries());
    }

    let paymentId;
    if (body && typeof body === "object") {
      if (body.resource === "event" || String(body.id || "").startsWith("event_")) {
        paymentId = body.entityId || body._embedded?.entity?.id;
      } else {
        paymentId = body.id;
      }
    }
    paymentId = paymentId || req.query?.id;

    if (!paymentId) {
      console.error("Mollie webhook missing payment entity ID:", {
        resource: body?.resource,
        eventType: body?.type,
        eventId: String(body?.id || "").startsWith("event_") ? body.id : undefined
      });
      return res.status(400).send("Missing payment entity id");
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
      console.error("Mollie webhook lookup error:", {
        status: response.status,
        title: payment.title,
        detail: payment.detail,
        paymentId
      });
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
