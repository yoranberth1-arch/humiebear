export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://www.hummiebear.be");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const SUPABASE_URL = "https://yrcajvpstbyupohjbavm.supabase.co";

  function parseBody(value) {
    if (!value) return {};
    if (typeof value === "object") return value;
    try { return JSON.parse(value); } catch { return {}; }
  }

  function cleanText(value, max = 255) {
    return String(value ?? "").trim().slice(0, max);
  }

  function positiveNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : NaN;
  }

  function roundMoney(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  function validGrams(value, max = 5000) {
    const grams = Number(value);
    return Number.isInteger(grams) && grams >= 100 && grams <= max && grams % 100 === 0;
  }

  const DEAL_PRICES = new Map([
    ["Zoete Snoepbox 500 g", 7.95],
    ["Zoete Snoepbox 1 kg", 15.90],
    ["Zoete Snoepbox 1,5 kg", 23.75],
    ["Zoete Snoepbox 2 kg", 31.50],
    ["Zure Snoepbox 500 g", 7.95],
    ["Zure Snoepbox 1 kg", 15.90],
    ["Zure Snoepbox 1,5 kg", 23.75],
    ["Zure Snoepbox 2 kg", 31.50],
    ["Zoet & Zuur Mix 500 g", 7.95],
    ["Zoet & Zuur Mix 1 kg", 15.90],
    ["Zoet & Zuur Mix 1,5 kg", 23.75],
    ["Zoet & Zuur Mix 2 kg", 31.50]
  ]);

  function calculateItem(item) {
    const meta = item && typeof item.meta === "object" && item.meta ? item.meta : null;
    const customMix = Array.isArray(item?.customMix) ? item.customMix : null;
    const quantity = Number(item?.quantity);

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      throw new Error("Ongeldige hoeveelheid in de bestelling.");
    }

    if (meta?.type === "deal") {
      const price = DEAL_PRICES.get(cleanText(meta.dealName, 120));
      if (price == null) throw new Error("Ongeldige voordeelbox.");
      return {
        name: cleanText(meta.dealName, 120) || "Snoepbox",
        quantity,
        unit_price: price,
        line_total: roundMoney(price * quantity),
        grams: validGrams(item?.grams) ? Number(item.grams) : null,
        meta: { type: "deal", dealName: cleanText(meta.dealName, 120) }
      };
    }

    if (meta?.type === "gift-box") {
      const size = Number(meta.size);
      if (!validGrams(size)) throw new Error("Ongeldig snoepdoosformaat.");
      const unitPrice = roundMoney(3.5 + (size / 100) * 1.70);
      return {
        name: "Gepersonaliseerde snoepdoos",
        quantity,
        unit_price: unitPrice,
        line_total: roundMoney(unitPrice * quantity),
        grams: size,
        meta: {
          type: "gift-box",
          size,
          sticker: cleanText(meta.sticker, 120),
          note: cleanText(meta.note, 500)
        }
      };
    }

    if (meta?.type === "personalized-bag") {
      const size = Number(meta.size);
      if (!validGrams(size)) throw new Error("Ongeldig snoepzakformaat.");
      const unitPrice = roundMoney((size / 100) * 1.70);
      return {
        name: "Gepersonaliseerde snoepzak",
        quantity,
        unit_price: unitPrice,
        line_total: roundMoney(unitPrice * quantity),
        grams: size,
        meta: {
          type: "personalized-bag",
          size,
          sticker: cleanText(meta.sticker, 120),
          bagColor: cleanText(meta.bagColor, 80),
          note: cleanText(meta.note, 500),
          selections: customMix
            ? customMix.slice(0, 20).map(x => ({
                name: cleanText(x?.name, 100),
                grams: validGrams(x?.grams) ? Number(x.grams) : 0
              }))
            : []
        }
      };
    }

    const grams = Number(item?.grams);
    if (!validGrams(grams)) throw new Error("Ongeldig snoepgewicht.");
    const unitPrice = roundMoney((grams / 100) * 1.70);

    return {
      name: cleanText(item?.name, 120) || "Schepsnoep",
      product_id: cleanText(item?.id, 120),
      quantity,
      unit_price: unitPrice,
      line_total: roundMoney(unitPrice * quantity),
      grams,
      meta: meta && typeof meta === "object"
        ? { type: cleanText(meta.type, 60) || "product" }
        : null
    };
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
    if (!apiKey) return res.status(500).json({ error: "MOLLIE_API_KEY is not configured." });

    const body = parseBody(req.body);
    const inputItems = body.items;
    const customer = body.customer || {};

    if (!Array.isArray(inputItems) || inputItems.length === 0 || inputItems.length > 50) {
      return res.status(400).json({ error: "De bestelling is ongeldig of leeg." });
    }

    const customerName = cleanText(customer.name, 120);
    const customerEmail = cleanText(customer.email, 180).toLowerCase();
    const customerPhone = cleanText(customer.phone, 50);
    const street = cleanText(customer.street, 120);
    const houseNumber = cleanText(customer.houseNumber, 30);
    const postalCode = cleanText(customer.postalCode, 20);
    const city = cleanText(customer.city, 100);
    const country = cleanText(customer.country || "BE", 10).toUpperCase();

    if (!customerName) return res.status(400).json({ error: "Vul je naam in." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      return res.status(400).json({ error: "Vul een geldig e-mailadres in." });
    }
    if (!street || !houseNumber || !postalCode || !city) {
      return res.status(400).json({ error: "Vul je volledige leveradres in." });
    }

    const calculatedItems = inputItems.map(calculateItem);
    const subtotal = roundMoney(calculatedItems.reduce((sum, item) => sum + item.line_total, 0));
    if (!(subtotal > 0)) return res.status(400).json({ error: "Het bestelbedrag is ongeldig." });

    const shipping = subtotal >= 55 ? 0 : 5.95;
    const total = roundMoney(subtotal + shipping);
    const origin = process.env.PUBLIC_SITE_URL || "https://www.hummiebear.be";
    const nameParts = customerName.trim().split(" ").filter(Boolean);
    const customerFirstName = nameParts.shift() || "Klant";
    const customerLastName = nameParts.join(" ") || "Onbekend";

    const orderRecord = {
      customer_first_name: customerFirstName,
      customer_last_name: customerLastName,
      customer_email: customerEmail,
      customer_phone: customerPhone || null,
      shipping_street: street,
      shipping_house_number: houseNumber,
      shipping_postal_code: postalCode,
      shipping_city: city,
      shipping_country: country,
      customer_note: cleanText(customer.note, 1000) || null,
      subtotal,
      discount_amount: 0,
      shipping_cost: shipping,
      total,
      source: "website",
      status: "new",
      payment_status: "pending",
      payment_provider: "mollie",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const createdOrders = await supabaseRequest("orders", {
      method: "POST",
      headers: { "Prefer": "return=representation" },
      body: JSON.stringify(orderRecord)
    });
    const createdOrder = Array.isArray(createdOrders) ? createdOrders[0] : createdOrders;
    const orderId = createdOrder?.id;
    const orderNumber = createdOrder?.order_number;
    if (!orderId) throw new Error("De bestelling kon niet worden opgeslagen.");

    const orderItems = calculatedItems.map(item => ({
      order_id: orderId,
      product_id: item.product_id || item.name,
      product_name: item.name,
      unit_price: item.unit_price,
      quantity: item.quantity,
      line_total: item.line_total,
      meta: { ...(item.meta || {}), ...(item.grams ? { grams: item.grams } : {}) }
    }));
    try {
      await supabaseRequest("order_items", {
        method: "POST",
        headers: { "Prefer": "return=minimal" },
        body: JSON.stringify(orderItems)
      });
    } catch (itemError) {
      await supabaseRequest("orders?id=eq." + encodeURIComponent(orderId), {
        method: "DELETE",
        headers: { "Prefer": "return=minimal" }
      }).catch(() => {});
      throw itemError;
    }

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
          value: total.toFixed(2)
        },
        description: "Hummie Bear bestelling " + (orderNumber || orderId),
        redirectUrl: origin + "/payment-success.html?order=" + encodeURIComponent(orderId),
        cancelUrl: origin + "/payment-cancelled.html?order=" + encodeURIComponent(orderId),
        webhookUrl: origin + "/api/mollie-webhook",
        metadata: {
          order_id: orderId
        }
      })
    });

    const data = await payment.json().catch(() => ({}));

    if (!payment.ok) {
      try {
        await supabaseRequest("orders?id=eq." + encodeURIComponent(orderId), {
          method: "PATCH",
          headers: { "Prefer": "return=minimal" },
          body: JSON.stringify({
            payment_status: "creation_failed",
            updated_at: new Date().toISOString()
          })
        });
      } catch (updateError) {
        console.error("Order status update after Mollie error failed:", updateError);
      }

      console.error("Mollie create payment error:", data);
      return res.status(payment.status || 500).json({
        error: data.detail || "Mollie kon de betaling niet aanmaken."
      });
    }

    await supabaseRequest("orders?id=eq." + encodeURIComponent(orderId), {
      method: "PATCH",
      headers: { "Prefer": "return=minimal" },
      body: JSON.stringify({
        payment_reference: data.id,
        payment_provider: "mollie",
        payment_status: data.status || "open",
        updated_at: new Date().toISOString()
      })
    });

    return res.status(200).json({
      id: data.id,
      checkoutUrl: data._links?.checkout?.href || null,
      status: data.status,
      orderId,
      orderNumber,
      total
    });
  } catch (error) {
    console.error("Create payment error:", error);
    return res.status(500).json({
      error: error.message || "Er ging iets mis bij het starten van de betaling."
    });
  }
}
