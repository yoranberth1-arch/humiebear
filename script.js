/* =========================================================
   HUMMIE BEAR — SUPABASE FORM BRIDGE
   Keeps the original site interactions and styling intact.
========================================================= */

(() => {
  const SUPABASE_URL = "https://xsabwmcjgjijmwxwyx.supabase.co";
  const SUPABASE_KEY = "sb_publishable_LoVCt7ZXZ4ytzpgKRcfwgg_O96TheUc";
  const LEGACY_SCRIPT = "https://raw.githubusercontent.com/yoranberth1-arch/humiebear/f8be20990c13c1303563f84c18bfe14d8806aaff/script.js";

  const originalFetch = window.fetch.bind(window);

  function text(fd, name) {
    const value = fd.get(name);
    return value == null ? null : String(value).trim() || null;
  }

  function list(fd, name) {
    return fd.getAll(name).map(String).filter(Boolean);
  }

  function getEdition(fd) {
    const selected = list(fd, "editions");
    if (selected.includes("Beide editions") ||
        (selected.includes("Hummie Bear Candy Edition") && selected.includes("Hummie Bear Waffle Edition"))) {
      return "both";
    }
    if (selected.includes("Hummie Bear Waffle Edition")) return "waffle";
    if (selected.includes("Hummie Bear Candy Edition")) return "candy";
    if (selected.includes("Snoepzakken op maat")) return "bags";
    return null;
  }

  function parseTimes(hours) {
    const match = String(hours || "").match(/(\d{1,2}:\d{2}).*?(\d{1,2}:\d{2})/);
    if (!match) return { start_time: null, end_time: null };
    return {
      start_time: `${match[1].padStart(5, "0")}:00`,
      end_time: `${match[2].padStart(5, "0")}:00`
    };
  }

  function estimatePrice(edition, guests, fd) {
    const startup = guests < 50 ? 150 : 0;
    if (edition === "waffle") {
      return guests * 20 + startup + (list(fd, "waffle_options").includes("Snoepzakje + €5 p.p.") ? guests * 5 : 0);
    }
    if (edition === "candy") return guests * 10 + startup;
    if (edition === "both") return guests * 29.5 + startup;
    return null;
  }

  async function saveToSupabase(fd) {
    const edition = getEdition(fd);
    if (!edition) throw new Error("Geen formule geselecteerd.");

    const guests = Number(text(fd, "guests") || 0);
    const hours = text(fd, "hours");
    const times = parseTimes(hours);

    const quote = {
      name: text(fd, "name"),
      organisation: text(fd, "name"),
      email: text(fd, "email"),
      phone: text(fd, "phone"),
      event_name: text(fd, "event_name"),
      event_date: text(fd, "date"),
      start_time: times.start_time,
      end_time: times.end_time,
      location: text(fd, "location"),
      guests: guests,
      hours: hours,
      event_type: text(fd, "event_type"),
      edition: edition,
      options: {
        selected_editions: list(fd, "editions"),
        waffle_options: list(fd, "waffle_options"),
        candy_options: list(fd, "candy_options"),
        bag_quantity: text(fd, "bag_quantity"),
        bag_composition: text(fd, "bag_composition"),
        bag_sweets: text(fd, "bag_sweets"),
        bag_personalization: list(fd, "bag_personalization")
      },
      practical_notes: text(fd, "practical_notes"),
      message: text(fd, "message"),
      estimated_price: estimatePrice(edition, guests, fd),
      status: "new"
    };

    const response = await originalFetch(`${SUPABASE_URL}/rest/v1/quotes`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify(quote),
      cache: "no-store"
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Hummie Bear Supabase error:", response.status, errorText);
      throw new Error(`Supabase ${response.status}: ${errorText}`);
    }

    console.log("Hummie Bear: aanvraag succesvol opgeslagen in Supabase.");
  }

  window.fetch = async function(input, init = {}) {
    const url = typeof input === "string" ? input : input?.url || "";

    if (url === "https://formspree.io/f/xnpqeljn" || url.startsWith("https://formspree.io/f/xnpqeljn?")) {
      const fd = init?.body instanceof FormData ? init.body : new FormData(document.getElementById("booking-form"));
      await saveToSupabase(fd);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return originalFetch(input, init);
  };

  /* Load the exact original interaction script used before the database work.
     This preserves the original formula-card styling/behaviour. */
  const script = document.createElement("script");
  script.src = `${LEGACY_SCRIPT}?v=restore-form-style-20260918`;
  script.defer = false;
  document.head.appendChild(script);
})();