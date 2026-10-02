export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).send("Method not allowed");
  }

  const SUPABASE_URL = "https://yrcajvpstbyupohjbavm.supabase.co";

  function parseBody(value) {
    if (!value) return {};
    if (typeof value === "object") return value;
    try { return JSON.parse(value); } catch {}
    try { return Object.fromEntries(new URLSearchParams(value).entries()); } catch {}
    return {};
  }

  async function supabaseRequest(path, options = {}) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
    const response = await fetch(SUPABASE_URL + "/rest/v1/" + path, {
      ...options,
      headers: {
        "apikey": key,
        "Authorization": "Bearer " + key,
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...(options.headers || {})
      }
    });
    const body = await response.text();
    let parsed = null;
    try { parsed = body ? JSON.parse(body) : null; } catch {}
    if (!response.ok) {
      const message = parsed?.message || parsed?.hint || body || "Supabase request failed.";
      throw new Error(message);
    }
    return parsed;
  }

  try {
    const apiKey = process.env.MOLLIE_API_KEY;
    if (!apiKey) {
      console.error("MOLLIE_API_KEY is not configured");
      return res.status(500).send("Server configuration error");
    }

    const body = parseBody(req.body);

    if (body.type === "hook.ping" || body.eventType === "hook.ping") {
      console.log("Mollie webhook ping received");
      return res.status(200).send("OK");
    }

    let paymentId;
    if (
      body.resource === "event" ||
      String(body.id || "").startsWith("event_") ||
      (typeof body.type === "string" && body.type.startsWith("payment."))
    ) {
      paymentId = body.entityId || body._embedded?.entity?.id || body.data?.id;
    } else {
      paymentId = body.id;
    }

    paymentId = paymentId || req.query?.id;

    if (typeof paymentId !== "string" || !/^tr_[A-Za-z0-9]+$/.test(paymentId)) {
      console.error("Missing or invalid Mollie payment ID");
      return res.status(400).send("Missing or invalid payment ID");
    }

    const response = await fetch(
      "https://api.mollie.com/v2/payments/" + encodeURIComponent(paymentId),
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
    const orderId = String(payment.metadata?.order_id || "").trim();

    const update = {
      payment_reference: payment.id,
      payment_provider: "mollie",
      payment_status: payment.status || "unknown",
      updated_at: new Date().toISOString()
    };

    if (payment.status === "paid") {
      update.paid_at = new Date().toISOString();
      update.status = "new";
    }

    if (payment.status === "canceled" || payment.status === "expired" || payment.status === "failed") {
      update.status = "cancelled";
    }

    if (orderId) {
      try {
        await supabaseRequest("orders?id=eq." + encodeURIComponent(orderId), {
          method: "PATCH",
          headers: { "Prefer": "return=minimal" },
          body: JSON.stringify(update)
        });
      } catch (dbError) {
        console.error("Order update failed:", dbError);
        return res.status(500).send("Order update failed");
      }
    } else {
      console.warn("Mollie payment without Hummie Bear order_id metadata:", payment.id);
    }

    console.log("Hummie Bear Mollie payment processed:", {
      id: payment.id,
      status: payment.status,
      amount: payment.amount,
      orderId
    });

    return res.status(200).send("OK");
  } catch (error) {
    console.error("Mollie webhook error:", error);
    return res.status(500).send("Webhook error");
  }
}
