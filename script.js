/* =========================================================
   HUMMIE BEAR — COMPLETE FORM + SUPABASE SCRIPT
   Behoudt de bestaande styling van style.css + form.css
========================================================= */

(() => {
  "use strict";

  /* =========================================================
     SUPABASE
  ========================================================= */

  const SUPABASE_URL =
    "https://yrcajvpstbyupohjbavm.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_TjBCB01RHm67xQVm3CtvEw_b0qxklDJ";


  /* =========================================================
     HELPERS
  ========================================================= */

  const $ = (selector, parent = document) =>
    parent.querySelector(selector);

  const $$ = (selector, parent = document) =>
    [...parent.querySelectorAll(selector)];


  function getValue(formData, name) {
    const value = formData.get(name);

    if (value === null || value === undefined) {
      return null;
    }

    const text = String(value).trim();

    return text === "" ? null : text;
  }


  function getValues(formData, name) {
    return formData
      .getAll(name)
      .map((value) => String(value).trim())
      .filter(Boolean);
  }


  /* =========================================================
     MOBILE MENU
  ========================================================= */

  const menuToggle = $(".menu-toggle");
  const mainNav = $(".main-nav");

  function closeMobileMenu() {

    if (!menuToggle || !mainNav) {
      return;
    }

    mainNav.classList.remove("open");

    menuToggle.setAttribute(
      "aria-expanded",
      "false"
    );

    menuToggle.setAttribute(
      "aria-label",
      "Menu openen"
    );

  }

  function toggleMobileMenu(event) {

    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!menuToggle || !mainNav) {
      return;
    }

    const willOpen =
      !mainNav.classList.contains("open");

    mainNav.classList.toggle(
      "open",
      willOpen
    );

    menuToggle.setAttribute(
      "aria-expanded",
      willOpen ? "true" : "false"
    );

    menuToggle.setAttribute(
      "aria-label",
      willOpen
        ? "Menu sluiten"
        : "Menu openen"
    );

  }

  if (menuToggle && mainNav) {

    menuToggle.addEventListener(
      "click",
      toggleMobileMenu,
      false
    );

    menuToggle.addEventListener(
      "touchend",
      (event) => {
        event.preventDefault();
        toggleMobileMenu(event);
      },
      { passive: false }
    );

    $(".main-nav a").forEach((link) => {

      link.addEventListener(
        "click",
        () => {
          closeMobileMenu();
        }
      );

    });

    document.addEventListener(
      "click",
      (event) => {

        if (
          mainNav.classList.contains("open") &&
          !mainNav.contains(event.target) &&
          !menuToggle.contains(event.target)
        ) {

          closeMobileMenu();

        }

      }
    );

    window.addEventListener(
      "resize",
      () => {

        if (window.innerWidth > 900) {
          closeMobileMenu();
        }

      }
    );

  }


  /* =========================================================
     DATUM — GEEN DATUM IN HET VERLEDEN
  ========================================================= */

  const dateInput =
    $('input[name="date"]');

  if (dateInput) {

    const today = new Date();

    const localDate = new Date(
      today.getTime() -
      today.getTimezoneOffset() * 60000
    )
      .toISOString()
      .split("T")[0];

    dateInput.min = localDate;

  }


  /* =========================================================
     FORMULIER ELEMENTEN
  ========================================================= */

  const form =
    $("#booking-form");

  const editionContainer =
    $(".edition-options");

  const candyFields =
    $("#candy-fields");

  const waffleFields =
    $("#waffle-fields");

  const bagFields =
    $("#bag-fields");

  const guestsInput =
    $('input[name="guests"]');


  /* =========================================================
     EDITION KAARTEN
     
     BELANGRIJK:
     Deze structuur wordt gebruikt door form.css.
  ========================================================= */

  if (editionContainer && !editionContainer.querySelector('input[name="editions"]')) {

    editionContainer.innerHTML = `

      <label class="edition-option edition-option--waffle">
        <input
          type="radio"
          name="editions"
          value="Hummie Bear Waffle Edition"
          required
        >

        <div class="edition-option-content">

          <span class="edition-option-kicker">
            WARME DESSERTBELEVING
          </span>

          <strong>
            Wafel Edition
          </strong>

          <small>
            Lollywafels, milkshakes, ijs, koffie en warme chocomelk.
          </small>

          <b>
            €20 p.p.
          </b>

          <em>
            Vanaf 20 personen · 2 uur all-in
          </em>

          <span class="edition-choice-text">
            Kies deze formule
          </span>

        </div>
      </label>


      <label class="edition-option edition-option--candy">
        <input
          type="radio"
          name="editions"
          value="Hummie Bear Candy Edition"
          required
        >

        <div class="edition-option-content">

          <span class="edition-option-kicker">
            KLEURRIJK & VRIJ KIEZEN
          </span>

          <strong>
            Candy Edition
          </strong>

          <small>
            65 soorten snoep en 500 gram per persoon.
          </small>

          <b>
            €10 p.p.
          </b>

          <em>
            Vanaf 35 personen · 2 uur catering
          </em>

          <span class="edition-choice-text">
            Kies deze formule
          </span>

        </div>
      </label>


      <label class="edition-option edition-option--combo">
        <input
          type="radio"
          name="editions"
          value="Beide editions"
          required
        >

        <div class="edition-option-content">

          <span class="edition-option-kicker">
            DE VOLLEDIGE BELEVING
          </span>

          <strong>
            Wafel + Candy Combo
          </strong>

          <small>
            Alle Wafel Edition-items én 65 soorten snoep.
          </small>

          <b>
            €29,50 p.p.
          </b>

          <em>
            Vanaf 35 personen · 2 uur all-in
          </em>

          <span class="edition-choice-text">
            Kies deze formule
          </span>

        </div>
      </label>


      <label class="edition-option edition-option--bags">
        <input
          type="radio"
          name="editions"
          value="Snoepzakken op maat"
          required
        >

        <div class="edition-option-content">

          <span class="edition-option-kicker">
            VOLLEDIG OP MAAT
          </span>

          <strong>
            Snoepzakken op maat
          </strong>

          <small>
            Kies aantal, snoepmix en eventuele personalisatie.
          </small>

          <b>
            Prijs op maat
          </b>

          <em>
            Ideaal als traktatie of bedankje
          </em>

          <span class="edition-choice-text">
            Kies deze formule
          </span>

        </div>
      </label>

    `;

  /* =========================================================
     EDITION INPUTS
  ========================================================= */

  const editionInputs = $$(
    'input[name="editions"]'
  );


  function selectedEditions() {

    return editionInputs
      .filter((input) => input.checked)
      .map((input) => input.value);

  }


  function getSelectedEdition() {

    const selected =
      selectedEditions();

    if (
      selected.includes(
        "Beide editions"
      )
    ) {

      return "both";

    }


    if (
      selected.includes(
        "Hummie Bear Waffle Edition"
      )
    ) {

      return "waffle";

    }


    if (
      selected.includes(
        "Hummie Bear Candy Edition"
      )
    ) {

      return "candy";

    }


    if (
      selected.includes(
        "Snoepzakken op maat"
      )
    ) {

      return "bags";

    }


    return null;

  }


  /* =========================================================
     EDITION PANELS
  ========================================================= */

  function updateEditionPanels() {

    const selected =
      selectedEditions();


    const candySelected =
      selected.includes(
        "Hummie Bear Candy Edition"
      ) ||
      selected.includes(
        "Beide editions"
      );


    const waffleSelected =
      selected.includes(
        "Hummie Bear Waffle Edition"
      ) ||
      selected.includes(
        "Beide editions"
      );


    const bagsSelected =
      selected.includes(
        "Snoepzakken op maat"
      );


    if (candyFields) {

      candyFields.hidden =
        !candySelected;

    }


    if (waffleFields) {

      waffleFields.hidden =
        !waffleSelected;

    }


    if (bagFields) {

      bagFields.hidden =
        !bagsSelected;

    }

  }


  /* =========================================================
     EDITION SELECTIE
  ========================================================= */

  editionInputs.forEach((input) => {

    input.addEventListener(
      "change",
      () => {

        /* Eén duidelijke formule per aanvraag. De kaarten zijn radio-
           keuzes, dus de browser beheert de exclusieve selectie. */
        updateEditionPanels();
        updateEstimate();
        return;

        const bothInput =
          editionInputs.find(
            (item) =>
              item.value ===
              "Beide editions"
          );


        const candyInput =
          editionInputs.find(
            (item) =>
              item.value ===
              "Hummie Bear Candy Edition"
          );


        const waffleInput =
          editionInputs.find(
            (item) =>
              item.value ===
              "Hummie Bear Waffle Edition"
          );


        /* -------------------------------------------------
           BEIDE EDITIONS
        ------------------------------------------------- */

        if (
          input.value ===
            "Beide editions" &&
          input.checked
        ) {

          if (candyInput) {

            candyInput.checked =
              true;

          }


          if (waffleInput) {

            waffleInput.checked =
              true;

          }

        }


        /* -------------------------------------------------
           ÉÉN VAN DE TWEE UITGEVINKT
        ------------------------------------------------- */

        if (
          input.value !==
            "Beide editions" &&
          !input.checked
        ) {

          if (bothInput) {

            bothInput.checked =
              false;

          }

        }


        /* -------------------------------------------------
           CANDY + WAFFLE LOS GESELECTEERD
        ------------------------------------------------- */

        if (
          candyInput?.checked &&
          waffleInput?.checked
        ) {

          if (bothInput) {

            bothInput.checked =
              true;

          }

        }


        /* -------------------------------------------------
           SNOEPZAKKEN
           
           Snoepzakken is een aparte keuze.
           Bij selectie worden de andere keuzes uitgezet.
        ------------------------------------------------- */

        if (
          input.value ===
            "Snoepzakken op maat" &&
          input.checked
        ) {

          editionInputs.forEach(
            (otherInput) => {

              if (
                otherInput !== input
              ) {

                otherInput.checked =
                  false;

              }

            }
          );

        }


        /* -------------------------------------------------
           ANDERE EDITION GEKOZEN
           
           Dan wordt snoepzakken automatisch uitgezet.
        ------------------------------------------------- */

        if (
          input.value !==
            "Snoepzakken op maat" &&
          input.checked
        ) {

          const bagsInput =
            editionInputs.find(
              (item) =>
                item.value ===
                "Snoepzakken op maat"
            );


          if (bagsInput) {

            bagsInput.checked =
              false;

          }

        }


        updateEditionPanels();

        updateEstimate();

      }
    );

  });


  /* Links vanaf de Wafel- en Candy-pagina openen het formulier
     meteen met de juiste formule geselecteerd. */
  const requestedEdition =
    new URLSearchParams(window.location.search).get("edition");

  const editionByQuery = {
    waffle: "Hummie Bear Waffle Edition",
    candy: "Hummie Bear Candy Edition",
    combo: "Beide editions",
    bags: "Snoepzakken op maat"
  };

  const requestedInput =
    editionInputs.find(
      (input) => input.value === editionByQuery[requestedEdition]
    );

  if (requestedInput) {
    requestedInput.checked = true;
  }


  updateEditionPanels();
  updateEstimate();


  /* =========================================================
     TOAST
  ========================================================= */

  function showToast(message) {

    const toast =
      $("#toast");

    if (!toast) {
      return;
    }


    toast.textContent =
      message;


    toast.classList.add(
      "show"
    );


    clearTimeout(
      showToast.timeout
    );


    showToast.timeout =
      setTimeout(() => {

        toast.classList.remove(
          "show"
        );

      }, 5000);

  }


  /* =========================================================
     MINIMUM AANTAL PERSONEN
  ========================================================= */

  function minimumFor(edition) {

    if (
      edition === "candy" ||
      edition === "both"
    ) {

      return 35;

    }


    if (
      edition === "waffle" ||
      edition === "bags"
    ) {

      return 20;

    }


    return 0;

  }


  /* =========================================================
     PRIJSBEREKENING
  ========================================================= */

  function calculatePrice(
    edition,
    guests,
    formData = null
  ) {

    const startup =
      guests < 50 ? 150 : 0;


    if (edition === "waffle") {

      let price =
        guests * 20;

      if (formData) {

        const waffleOptions =
          getValues(
            formData,
            "waffle_options"
          );


        if (
          waffleOptions.includes(
            "Snoepzakje + €5 p.p."
          )
        ) {

          price +=
            guests * 5;

        }

      }

      return price + startup;

    }


    if (edition === "candy") {

      return (
        guests * 10 +
        startup
      );

    }


    if (edition === "both") {

      return (
        guests * 29.5 +
        startup
      );

    }


    /* Snoepzakken:
       prijs is op maat.
    */

    return null;

  }


  /* =========================================================
     PRIJS FORMATTEREN
  ========================================================= */

  function formatPrice(price) {

    if (
      price === null ||
      price === undefined ||
      Number.isNaN(price)
    ) {

      return "Prijs op maat";

    }


    return new Intl.NumberFormat(
      "nl-BE",
      {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    ).format(price);

  }


  /* =========================================================
     PRIJS UPDATE
     
     Ondersteunt verschillende mogelijke IDs
     zonder bestaande HTML te breken.
  ========================================================= */

  function updateEstimate() {

    if (!guestsInput) {
      return;
    }


    const edition =
      getSelectedEdition();


    const guests =
      Number(
        guestsInput.value || 0
      );


    const formData =
      form
        ? new FormData(form)
        : null;


    const price =
      calculatePrice(
        edition,
        guests,
        formData
      );


    const estimateElements = [
      $("#estimated-price"),
      $("#price-estimate"),
      $(".estimated-price"),
      $(".price-estimate")
    ].filter(Boolean);


    estimateElements.forEach(
      (element) => {

        element.textContent =
          price === null
            ? "Prijs op maat"
            : formatPrice(price);

      }
    );

  }


  if (guestsInput) {

    guestsInput.addEventListener(
      "input",
      updateEstimate
    );

  }


  /* =========================================================
     TIJDEN UITHALEN
  ========================================================= */

  function parseTimes(hours) {

    const value =
      String(hours || "");


    const match =
      value.match(
        /(\d{1,2}:\d{2}).*?(\d{1,2}:\d{2})/
      );


    if (!match) {

      return {
        start_time: null,
        end_time: null
      };

    }


    return {

      start_time:
        `${match[1].padStart(5, "0")}:00`,

      end_time:
        `${match[2].padStart(5, "0")}:00`

    };

  }


  /* =========================================================
     SUPABASE DATA
  ========================================================= */

  function buildQuote(formData) {

    const edition =
      getSelectedEdition();


    if (!edition) {

      throw new Error(
        "Geen formule geselecteerd."
      );

    }


    const guests =
      Number(
        getValue(
          formData,
          "guests"
        ) || 0
      );


    const minimum =
      minimumFor(edition);


    if (
      !guests ||
      guests < minimum
    ) {

      throw new Error(
        `Minimum aantal personen voor deze formule is ${minimum}.`
      );

    }


    const hours =
      getValue(
        formData,
        "hours"
      );


    const times =
      parseTimes(hours);


    const estimatedPrice =
      calculatePrice(
        edition,
        guests,
        formData
      );


    return {

      name:
        getValue(
          formData,
          "name"
        ),


      organisation:
        getValue(
          formData,
          "organisation"
        ) ||
        getValue(
          formData,
          "name"
        ),


      email:
        getValue(
          formData,
          "email"
        ),


      phone:
        getValue(
          formData,
          "phone"
        ),


      event_name:
        getValue(
          formData,
          "event_name"
        ),


      event_date:
        getValue(
          formData,
          "date"
        ),


      start_time:
        times.start_time,


      end_time:
        times.end_time,


      location:
        getValue(
          formData,
          "location"
        ),


      guests:
        guests,


      hours:
        hours,


      event_type:
        getValue(
          formData,
          "event_type"
        ),


      edition:
        edition,


      options: {

        selected_editions:
          getValues(
            formData,
            "editions"
          ),

        waffle_options:
          getValues(
            formData,
            "waffle_options"
          ),

        candy_options:
          getValues(
            formData,
            "candy_options"
          ),

        bag_quantity:
          getValue(
            formData,
            "bag_quantity"
          ),

        bag_composition:
          getValue(
            formData,
            "bag_composition"
          ),

        bag_sweets:
          getValue(
            formData,
            "bag_sweets"
          ),

        bag_personalization:
          getValues(
            formData,
            "bag_personalization"
          )

      },


      practical_notes:
        getValue(
          formData,
          "practical_notes"
        ),


      message:
        getValue(
          formData,
          "message"
        ),


      estimated_price:
        estimatedPrice,


      status:
        "new"

    };

  }


  /* =========================================================
     SUPABASE OPSLAAN
  ========================================================= */

  async function saveToSupabase(
    formData
  ) {

    const quote =
      buildQuote(formData);


    console.log(
      "Hummie Bear — aanvraag:",
      quote
    );


    const response =
      await fetch(
        `${SUPABASE_URL}/rest/v1/quotes`,
        {

          method: "POST",

          headers: {

            "apikey":
              SUPABASE_KEY,

            "Authorization":
              `Bearer ${SUPABASE_KEY}`,

            "Content-Type":
              "application/json",

            "Accept":
              "application/json",

            "Prefer":
              "return=minimal"

          },

          body:
            JSON.stringify(quote),

          cache:
            "no-store"

        }
      );


    if (!response.ok) {

      const errorText =
        await response.text();


      console.error(
        "Hummie Bear Supabase error:",
        response.status,
        errorText
      );


      throw new Error(
        `Supabase ${response.status}: ${errorText}`
      );

    }


    console.log(
      "Hummie Bear: aanvraag succesvol opgeslagen."
    );

  }


  /* =========================================================
     FORMULIER VERSTUREN
  ========================================================= */

  if (form) {

    form.addEventListener(
      "submit",
      async (event) => {

        event.preventDefault();


        /* -------------------------------------------------
           EDITION CONTROLEREN
        ------------------------------------------------- */

        const edition =
          getSelectedEdition();


        if (!edition) {

          showToast(
            "Kies eerst een formule."
          );


          $(".edition-selector")
            ?.scrollIntoView({
              behavior: "smooth",
              block: "center"
            });


          return;

        }


        /* -------------------------------------------------
           FORM DATA
        ------------------------------------------------- */

        const formData =
          new FormData(form);


        /* -------------------------------------------------
           MINIMUM PERSONEN
        ------------------------------------------------- */

        const guests =
          Number(
            getValue(
              formData,
              "guests"
            ) || 0
          );


        const minimum =
          minimumFor(edition);


        if (
          !guests ||
          guests < minimum
        ) {

          showToast(
            `Voor deze formule heb je minstens ${minimum} personen nodig.`
          );


          guestsInput?.focus();


          return;

        }


        /* -------------------------------------------------
           SUBMIT BUTTON
        ------------------------------------------------- */

        const submitButton =
          form.querySelector(
            ".submit-button"
          );


        const originalText =
          submitButton
            ? submitButton.innerHTML
            : "";


        if (submitButton) {

          submitButton.disabled =
            true;


          submitButton.innerHTML =
            "Aanvraag versturen…";

        }


        /* -------------------------------------------------
           VERSTUREN
        ------------------------------------------------- */

        try {

          await saveToSupabase(
            formData
          );


          /* -----------------------------------------------
             SUCCES
          ----------------------------------------------- */

          form.reset();


          updateEditionPanels();


          updateEstimate();


          showToast(
            "Bedankt! Je aanvraag is goed verstuurd."
          );


          /* -----------------------------------------------
             TERUG NAAR CONTACT
          ----------------------------------------------- */

          setTimeout(() => {

            $("#contact")
              ?.scrollIntoView({
                behavior: "smooth",
                block: "start"
              });

          }, 300);


        } catch (error) {

          console.error(
            "Hummie Bear form error:",
            error
          );


          /* -----------------------------------------------
             FOUTMELDING
          ----------------------------------------------- */

          showToast(
            "Er ging iets mis. Probeer opnieuw of mail ons via hummiebearbusiness@gmail.com."
          );

        } finally {

          if (submitButton) {

            submitButton.disabled =
              false;


            submitButton.innerHTML =
              originalText;

          }

        }

      }
    );

  }


  /* =========================================================
     INTERACTIEVE EDITION-KAARTEN OP HOMEPAGE
  ========================================================= */

  $$(".edition-card").forEach(
    (card) => {

      card.addEventListener(
        "mousemove",
        (event) => {

          if (
            window.innerWidth < 900
          ) {

            return;

          }


          const rect =
            card.getBoundingClientRect();


          const x =
            event.clientX -
            rect.left;


          const y =
            event.clientY -
            rect.top;


          const centerX =
            rect.width / 2;


          const centerY =
            rect.height / 2;


          const rotateX =
            ((y - centerY) /
              centerY) *
            -1.5;


          const rotateY =
            ((x - centerX) /
              centerX) *
            1.5;


          card.style.transform =
            `perspective(900px)
             rotateX(${rotateX}deg)
             rotateY(${rotateY}deg)
             translateY(-7px)`;

        }
      );


      card.addEventListener(
        "mouseleave",
        () => {

          card.style.transform =
            "";

        }
      );

    }
  );


  /* =========================================================
     FORMULIER FOCUS EFFECT
  ========================================================= */

  $$(
    ".booking-form input, .booking-form textarea, .booking-form select"
  ).forEach(
    (field) => {

      field.addEventListener(
        "focus",
        () => {

          field.closest(
            "label"
          )?.classList.add(
            "field-focused"
          );

        }
      );


      field.addEventListener(
        "blur",
        () => {

          field.closest(
            "label"
          )?.classList.remove(
            "field-focused"
          );

        }
      );

    }
  );


  /* =========================================================
     SMOOTH SCROLL
  ========================================================= */

  $$(
    'a[href^="#"]'
  ).forEach(
    (link) => {

      link.addEventListener(
        "click",
        (event) => {

          const targetId =
            link.getAttribute(
              "href"
            );


          if (
            !targetId ||
            targetId === "#"
          ) {

            return;

          }


          const target =
            document.querySelector(
              targetId
            );


          if (!target) {

            return;

          }


          event.preventDefault();


          target.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });

        }
      );

    }
  );


  /* =========================================================
     INIT
  ========================================================= */

  updateEditionPanels();
  updateEstimate();


  console.log(
    "Hummie Bear script geladen."
  );

})();
