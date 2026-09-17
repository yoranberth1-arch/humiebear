/* =========================================================
   HUMMIE BEAR — SITE + SUPABASE FORM
========================================================= */

(() => {
  const SUPABASE_URL = "https://xsabwmcjgjijmwxwyx.supabase.co";
  const SUPABASE_KEY = "sb_publishable_LoVCt7ZXZ4ytzpgKRcfwgg_O96TheUc";

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
     OFFERTEFORMULIER
  --------------------------------------------------------- */
  const form = $("#booking-form");

  if (form) {
    const editionContainer = $(".edition-options", form);
    const waffleFields = $("#waffle-fields");
    const candyFields = $("#candy-fields");
    const bagFields = $("#bag-fields");
    const estimate = $("#live-estimate");
    const estimateTitle = $("#estimate-title");
    const estimateAmount = $("#estimate-amount");
    const estimateNote = $("#estimate-note");
    const guestsInput = $("input[name='guests']", form);

    /* -------------------------------------------------------
       FORMULEKAARTEN
    ------------------------------------------------------- */
    if (editionContainer) {
      editionContainer.innerHTML = `
        <label class="edition-option-card">
          <input type="radio" name="editions" value="Hummie Bear Waffle Edition">
          <span class="edition-option-content">
            <strong>Waffle Edition</strong>
            <small>Vanaf 20 personen · €20 p.p. · 2 uur · €150 opstart 20–49 · vanaf 50 geen opstart</small>
          </span>
        </label>
        <label class="edition-option-card">
          <input type="radio" name="editions" value="Hummie Bear Candy Edition">
          <span class="edition-option-content">
            <strong>Candy Edition</strong>
            <small>Vanaf 35 personen · €10 p.p. · 500 gram p.p. · €150 opstart 35–49 · vanaf 50 geen opstart</small>
          </span>
        </label>
        <label class="edition-option-card">
          <input type="radio" name="editions" value="Beide editions">
          <span class="edition-option-content">
            <strong>Candy + Waffle</strong>
            <small>Vanaf 35 personen · €29,50 p.p. · 2 uur · €150 opstart 35–49 · vanaf 50 geen opstart</small>
          </span>
        </label>
        <label class="edition-option-card">
          <input type="radio" name="editions" value="Snoepzakken op maat">
          <span class="edition-option-content">
            <strong>Snoepzakken op maat</strong>
            <small>Vanaf 20 personen · 2 uur · prijs per snoepzak wordt op maat berekend · €150 opstart 20–49</small>
          </span>
        </label>
      `;
    }

    const editionInputs = $$('input[name="editions"]', form);

    /* -------------------------------------------------------
       EXTRA OPTIES
    ------------------------------------------------------- */
    if (waffleFields) {
      waffleFields.innerHTML = `
        <div class="extra-panel-inner">
          <strong>Waffle opties</strong>
          <label class="check-option"><input type="checkbox" name="waffle_options" value="Snoepzakje + €5 p.p."> <span>Snoepzakje + €5 p.p.</span></label>
        </div>
      `;
    }

    if (candyFields) {
      candyFields.innerHTML = `
        <div class="extra-panel-inner">
          <strong>Candy voorkeur</strong>
          <label class="check-option"><input type="checkbox" name="candy_options" value="Vegan snoep gewenst"> <span>Vegan snoep gewenst</span></label>
        </div>
      `;
    }

    if (bagFields) {
      bagFields.innerHTML = `
        <div class="extra-panel-inner">
          <strong>Snoepzakken op maat</strong>
          <div class="form-row">
            <label>Aantal zakjes<input type="number" name="bag_quantity" min="1" placeholder="bv. 50"></label>
            <label>Inhoud / samenstelling<input type="text" name="bag_composition" placeholder="bv. gemengd snoep"></label>
          </div>
          <label>Gewenst snoep<input type="text" name="bag_sweets" placeholder="bv. Haribo, zure snoepjes..."></label>
          <label class="check-option"><input type="checkbox" name="bag_personalization" value="Personalisatie gewenst"> <span>Personalisatie gewenst</span></label>
          <p class="extra-note">De prijs van snoepzakken wordt op maat berekend.</p>
        </div>
      `;
    }

    function getSelectedEdition() {
      return editionInputs.find(input => input.checked)?.value || null;
    }

    function minimumGuests(edition) {
      if (edition === "Hummie Bear Candy Edition" || edition === "Beide editions") return 35;
      return 20;
    }

    function updateEditionUI() {
      const selected = getSelectedEdition();
      const waffle = selected === "Hummie Bear Waffle Edition" || selected === "Beide editions";
      const candy = selected === "Hummie Bear Candy Edition" || selected === "Beide editions";
      const bags = selected === "Snoepzakken op maat";

      if (waffleFields) waffleFields.hidden = !waffle;
      if (candyFields) candyFields.hidden = !candy;
      if (bagFields) bagFields.hidden = !bags;

      editionInputs.forEach(input => {
        input.closest(".edition-option-card")?.classList.toggle("selected", input.checked);
      });

      if (guestsInput) guestsInput.min = String(minimumGuests(selected));
      updateEstimate();
    }

    function updateEstimate() {
      const selected = getSelectedEdition();
      const guests = Number(guestsInput?.value || 0);

      if (!selected || !guests) {
        if (estimate) estimate.hidden = false;
        if (estimateTitle) estimateTitle.textContent = "Indicatie van je formule";
        if (estimateAmount) estimateAmount.textContent = "—";
        if (estimateNote) estimateNote.textContent = "Vul je gegevens in om een richtprijs te zien.";
        return;
      }

      const min = minimumGuests(selected);
      if (guests < min) {
        if (estimate) estimate.hidden = false;
        if (estimateTitle) estimateTitle.textContent = "Aantal personen te laag";
        if (estimateAmount) estimateAmount.textContent = `Minimaal ${min} personen`;
        if (estimateNote) estimateNote.textContent = `Deze formule start vanaf ${min} personen.`;
        return;
      }

      const startup = guests < 50 ? 150 : 0;
      let total = null;
      let note = "";

      if (selected === "Hummie Bear Waffle Edition") {
        total = guests * 20 + startup;
        const bag = $("input[name='waffle_options'][value='Snoepzakje + €5 p.p.']", form);
        if (bag?.checked) total += guests * 5;
        note = `€20 p.p.${bag?.checked ? " + €5 p.p. snoepzakje" : ""}${startup ? " + €150 opstartkost" : " · geen opstartkost"}.`;
      } else if (selected === "Hummie Bear Candy Edition") {
        total = guests * 10 + startup;
        note = `€10 p.p.${startup ? " + €150 opstartkost" : " · geen opstartkost"}.`;
      } else if (selected === "Beide editions") {
        total = guests * 29.5 + startup;
        note = `€29,50 p.p.${startup ? " + €150 opstartkost" : " · geen opstartkost"}.`;
      } else if (selected === "Snoepzakken op maat") {
        if (estimate) estimate.hidden = false;
        if (estimateTitle) estimateTitle.textContent = "Indicatie van je formule";
        if (estimateAmount) estimateAmount.textContent = "Op maat";
        if (estimateNote) estimateNote.textContent = `Prijs per snoepzak wordt berekend op basis van je wensen.${startup ? " €150 opstartkost." : " Geen opstartkost vanaf 50 personen."}`;
        return;
      }

      if (estimate) estimate.hidden = false;
      if (estimateTitle) estimateTitle.textContent = "Indicatie van je formule";
      if (estimateAmount) estimateAmount.textContent = `± €${total.toFixed(2).replace(".", ",")}`;
      if (estimateNote) estimateNote.textContent = note;
    }

    editionInputs.forEach(input => input.addEventListener("change", updateEditionUI));
    guestsInput?.addEventListener("input", updateEstimate);
    form.querySelectorAll('input[name="waffle_options"]').forEach(input => input.addEventListener("change", updateEstimate));
    updateEditionUI();

    /* -------------------------------------------------------
       SUPABASE — QUOTE OPSLAAN
    ------------------------------------------------------- */
    async function saveQuote() {
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
      const startup = guests < 50 ? 150 : 0;
      let estimatedPrice = null;
      if (edition === "waffle") estimatedPrice = guests * 20 + startup + (waffleOptions.includes("Snoepzakje + €5 p.p.") ? guests * 5 : 0);
      if (edition === "candy") estimatedPrice = guests * 10 + startup;
      if (edition === "both") estimatedPrice = guests * 29.5 + startup;

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
          bag_personalization: values(fd, "bag_personalization")
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
        throw new Error(`Supabase ${response.status}`);
      }

      console.log("Hummie Bear: aanvraag succesvol opgeslagen in Supabase.");
    }

    /* -------------------------------------------------------
       FORMULIER VERSTUREN
    ------------------------------------------------------- */
    form.addEventListener("submit", async event => {
      event.preventDefault();

      if (!editionInputs.some(input => input.checked)) {
        showToast("Kies eerst Waffle Edition, Candy Edition, beide of snoepzakken op maat.");
        editionContainer?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      if (!form.reportValidity()) return;

      const selected = getSelectedEdition();
      const guests = Number(guestsInput?.value || 0);
      const min = minimumGuests(selected);
      if (guests < min) {
        showToast(`Deze formule start vanaf ${min} personen.`);
        guestsInput?.focus();
        return;
      }

      const submitButton = $(".submit-button", form);
      const originalText = submitButton?.innerHTML || "";
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = "Aanvraag versturen…";
      }

      try {
        await saveQuote();
        form.reset();
        updateEditionUI();
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
     INTERACTIEVE EDITION-KAARTEN
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
     FOCUS EFFECT
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
