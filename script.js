/* =========================================================
   HUMMIE BEAR — SITE + SUPABASE FORM
========================================================= */

(() => {
  const SUPABASE_URL = "https://xsabwmcjgjijmwxwyx.supabase.co";
  const SUPABASE_KEY = "sb_publishable_LoVCt7ZXZ4ytzpgKRcfwgg_O96TheUc";

  /* ---------------------------------------------------------
     HELPERS
  --------------------------------------------------------- */
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function value(formData, name) {
    const v = formData.get(name);
    return v === null || v === undefined ? null : String(v).trim() || null;
  }

  function values(formData, name) {
    return formData.getAll(name).map(String).filter(Boolean);
  }

  function showToast(message) {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 5000);
  }

  /* ---------------------------------------------------------
     MOBIEL MENU
  --------------------------------------------------------- */
  const menuToggle = $(".menu-toggle");
  const mainNav = $(".main-nav");

  if (menuToggle && mainNav) {
    menuToggle.addEventListener("click", () => {
      const open = mainNav.classList.toggle("open");
      menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    $$(".main-nav a").forEach(link => {
      link.addEventListener("click", () => {
        mainNav.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------------------------------------------------------
     DATUM
  --------------------------------------------------------- */
  const dateInput = $("input[name='date']");
  if (dateInput) {
    const today = new Date();
    const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
      .toISOString().split("T")[0];
    dateInput.min = localDate;
  }

  /* ---------------------------------------------------------
     EDITION SELECTIE
  --------------------------------------------------------- */
  const editionInputs = $$('input[name="editions"]');
  const candyFields = $("#candy-fields");
  const waffleFields = $("#waffle-fields");

  function selectedEditions() {
    return editionInputs.filter(input => input.checked).map(input => input.value);
  }

  function updateEditionPanels() {
    const selected = selectedEditions();
    const candySelected = selected.includes("Hummie Bear Candy Edition") || selected.includes("Beide editions");
    const waffleSelected = selected.includes("Hummie Bear Waffle Edition") || selected.includes("Beide editions");

    if (candyFields) candyFields.hidden = !candySelected;
    if (waffleFields) waffleFields.hidden = !waffleSelected;
  }

  editionInputs.forEach(input => {
    input.addEventListener("change", () => {
      const both = editionInputs.find(item => item.value === "Beide editions");
      const candy = editionInputs.find(item => item.value === "Hummie Bear Candy Edition");
      const waffle = editionInputs.find(item => item.value === "Hummie Bear Waffle Edition");

      if (input.value === "Beide editions" && input.checked) {
        if (candy) candy.checked = true;
        if (waffle) waffle.checked = true;
      }

      if (input.value !== "Beide editions" && !input.checked && both) {
        both.checked = false;
      }

      if (candy?.checked && waffle?.checked && both) {
        both.checked = true;
      }

      updateEditionPanels();
    });
  });

  updateEditionPanels();

  /* ---------------------------------------------------------
     SUPABASE — QUOTE OPSLAAN
  --------------------------------------------------------- */
  async function saveQuote(form) {
    const fd = new FormData(form);
    const label = value(fd, "editions");

    const editionMap = {
      "Hummie Bear Waffle Edition": "waffle",
      "Hummie Bear Candy Edition": "candy",
      "Beide editions": "both",
      "Snoepzakken op maat": "bags"
    };

    const edition = editionMap[label] || null;
    if (!edition) throw new Error("Geen formule geselecteerd.");

    const guests = Number(value(fd, "guests") || 0);
    const hours = value(fd, "hours");

    let startTime = null;
    let endTime = null;
    const match = hours?.match(/(\d{1,2}:\d{2}).*?(\d{1,2}:\d{2})/);
    if (match) {
      startTime = `${match[1].padStart(5, "0")}:00`;
      endTime = `${match[2].padStart(5, "0")}:00`;
    }

    const waffleOptions = values(fd, "waffle_options");
    const candyOptions = values(fd, "candy_options");

    let estimatedPrice = null;
    const startup = guests < 50 ? 150 : 0;
    if (edition === "waffle") {
      estimatedPrice = guests * 20 + startup + (waffleOptions.includes("Snoepzakje + €5 p.p.") ? guests * 5 : 0);
    } else if (edition === "candy") {
      estimatedPrice = guests * 10 + startup;
    } else if (edition === "both") {
      estimatedPrice = guests * 29.5 + startup;
    }

    const quote = {
      name: value(fd, "name"),
      organisation: value(fd, "name"),
      email: value(fd, "email"),
      phone: value(fd, "phone"),
      event_name: value(fd, "event_name"),
      event_date: value(fd, "date"),
      start_time: startTime,
      end_time: endTime,
      location: value(fd, "location"),
      guests,
      hours,
      event_type: value(fd, "event_type"),
      edition,
      options: {
        waffle_options: waffleOptions,
        candy_options: candyOptions,
        bag_quantity: value(fd, "bag_quantity"),
        bag_composition: value(fd, "bag_composition"),
        bag_sweets: value(fd, "bag_sweets"),
        bag_personalization: value(fd, "bag_personalization")
      },
      practical_notes: value(fd, "practical_notes"),
      message: value(fd, "message"),
      estimated_price: estimatedPrice,
      status: "new"
    };

    console.log("Hummie Bear: aanvraag naar Supabase sturen…");

    const response = await fetch(`${SUPABASE_URL}/rest/v1/quotes`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json",
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
    return true;
  }

  /* ---------------------------------------------------------
     FORMULIER — DIRECT NAAR SUPABASE
  --------------------------------------------------------- */
  const form = $("#booking-form");

  if (form) {
    form.addEventListener("submit", async event => {
      event.preventDefault();

      if (!editionInputs.some(input => input.checked)) {
        showToast("Kies eerst Waffle Edition, Candy Edition, beide of snoepzakken op maat.");
        $(".edition-selector")?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      if (!form.reportValidity()) return;

      const submitButton = $(".submit-button", form);
      const originalText = submitButton?.innerHTML || "";

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = "Aanvraag versturen…";
      }

      try {
        await saveQuote(form);
        form.reset();
        updateEditionPanels();
        showToast("Bedankt! Je aanvraag is goed verstuurd.");
        setTimeout(() => $("#contact")?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
      } catch (error) {
        console.error("Hummie Bear formulierfout:", error);
        showToast("Er ging iets mis bij het versturen. Probeer opnieuw of mail ons via hummiebearbusiness@gmail.com.");
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.innerHTML = originalText;
        }
      }
    });
  }

  /* ---------------------------------------------------------
     EDITION KAARTEN
  --------------------------------------------------------- */
  $$(".edition-card").forEach(card => {
    card.addEventListener("mousemove", event => {
      if (window.innerWidth < 900) return;
      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const rotateX = ((y - rect.height / 2) / (rect.height / 2)) * -1.5;
      const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * 1.5;
      card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-7px)`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });

  /* ---------------------------------------------------------
     FORM FOCUS EFFECT
  --------------------------------------------------------- */
  $$(".booking-form input, .booking-form textarea, .booking-form select").forEach(field => {
    field.addEventListener("focus", () => field.closest("label")?.classList.add("field-focused"));
    field.addEventListener("blur", () => field.closest("label")?.classList.remove("field-focused"));
  });

  /* ---------------------------------------------------------
     SMOOTH SCROLL
  --------------------------------------------------------- */
  $$('a[href^="#"]').forEach(link => {
    link.addEventListener("click", event => {
      const targetId = link.getAttribute("href");
      if (!targetId || targetId === "#") return;
      const target = $(targetId);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
})();
