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
     Handled directly by the button in index.html.
     This keeps navigation independent from the rest of the script.
  ========================================================= */


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

  const wafflePackageFields =
    $("#waffle-package-fields");

  const pastaFields = $("#pasta-fields");

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
      <label class="edition-option edition-option--pasta"><input type="radio" name="editions" value="Hummie Bear Pasta Concept" required><div class="edition-option-content"><span class="edition-option-kicker">HOOFDGERECHT</span><strong>Pasta Concept</strong><small>Verse pasta met huisgemaakte sauzen.</small><b>€15 p.p.</b><em>Vanaf 30 personen · €150 opstartkost bij 30–49 personen</em><span class="edition-choice-text">Kies Pasta →</span></div></label>
      <label class="edition-option edition-option--waffle"><input type="radio" name="editions" value="Hummie Bear Waffle Concept" required><div class="edition-option-content"><span class="edition-option-kicker">DESSERTBELEVING</span><strong>Waffle Concept</strong><small>Lollywafels met toppings; kies basis of één extra.</small><b>€12 basis · €16 met extra</b><em>Vanaf 30 personen · 2 uur all-in</em><span class="edition-choice-text">Kies Waffle →</span></div></label>
      <label class="edition-option edition-option--candy"><input type="radio" name="editions" value="Hummie Bear Candy Concept" required><div class="edition-option-content"><span class="edition-option-kicker">66 SOORTEN SNOEP</span><strong>Candy Concept</strong><small>500 gram snoep per persoon.</small><b>€10 p.p.</b><em>Vanaf 50 personen</em><span class="edition-choice-text">Kies Candy →</span></div></label>
      <label class="edition-option edition-option--combo"><input type="radio" name="editions" value="Pasta + Waffle Combinatie" required><div class="edition-option-content"><span class="edition-option-kicker">HOOFDGERECHT + DESSERT</span><strong>Pasta + Waffle Combinatie</strong><small>Verse pasta met lollywafel als dessert.</small><b>€27 basis · €31 met extra p.p.</b><em>Vanaf 30 personen</em><span class="edition-choice-text">Kies combinatie →</span></div></label>
    `;
    `;

  }


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
    const selected = selectedEditions()[0];
    const map = {
      "Hummie Bear Pasta Concept": "pasta",
      "Hummie Bear Waffle Concept": "waffle",
      "Hummie Bear Candy Concept": "candy",
      "Pasta + Waffle Combinatie": "pasta_waffle",
      "Snoepzakken op maat": "bags"
    };
    return map[selected] || null;
  }

  function updateEditionPanels() {
    const selected = selectedEditions()[0];
    const isPasta = selected === "Hummie Bear Pasta Concept";
    const isWaffle = selected === "Hummie Bear Waffle Concept";
    const isCandy = selected === "Hummie Bear Candy Concept";
    const isCombo = selected === "Pasta + Waffle Combinatie";
    const isBags = selected === "Snoepzakken op maat";
    if (candyFields) candyFields.hidden = !isCandy;
    if (waffleFields) waffleFields.hidden = !(isWaffle || isCombo);
    if (wafflePackageFields) wafflePackageFields.hidden = !(isWaffle || isCombo);
    if (pastaFields) pastaFields.hidden = !(isPasta || isCombo);
    if (bagFields) bagFields.hidden = !isBags;
    editionInputs.forEach(input => input.closest(".edition-option")?.classList.toggle("selected",input.checked));
    const summary=document.getElementById("edition-summary");
    if(summary){
      const labels={
        "Hummie Bear Pasta Concept":"Pasta Concept",
        "Hummie Bear Waffle Concept":"Waffle Concept",
        "Hummie Bear Candy Concept":"Candy Concept",
        "Pasta + Waffle Combinatie":"Pasta + Waffle Combinatie",
        "Snoepzakken op maat":"Snoepzakken op maat"
      };
      const selectedInput=editionInputs.find(input=>input.checked);
      const strong=summary.querySelector("strong");
      if(strong) strong.textContent=selectedInput?labels[selectedInput.value]:"Nog geen concept gekozen";
      summary.classList.toggle("has-selection",Boolean(selectedInput));
    }
  }

  editionInputs.forEach(input=>{
    input.addEventListener("change",()=>{
      updateEditionPanels();
      updateEstimate();
      const targetPanel=(input.value==="Hummie Bear Waffle Concept"||input.value==="Pasta + Waffle Combinatie")?waffleFields:
        input.value==="Hummie Bear Candy Concept"?candyFields:
        input.value==="Hummie Bear Pasta Concept"?document.querySelector(".edition-summary"):document.querySelector(".edition-summary");
      setTimeout(()=>targetPanel?.scrollIntoView({behavior:"smooth",block:"nearest"}),80);
    });
  });

  const requestedEdition=new URLSearchParams(window.location.search).get("edition");
  const editionByQuery={
    pasta:"Hummie Bear Pasta Concept",
    waffle:"Hummie Bear Waffle Concept",
    candy:"Hummie Bear Candy Concept",
    combo:"Pasta + Waffle Combinatie",
    bags:"Snoepzakken op maat"
  };
  const requestedInput=editionInputs.find(input=>input.value===editionByQuery[requestedEdition]);
  if(requestedInput) requestedInput.checked=true;
  updateEditionPanels();
  updateEstimate();

  /* =========================================================
     TOAST  /* =========================================================
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
    if(edition==="candy") return 50;
    if(["pasta","waffle","pasta_waffle"].includes(edition)) return 30;
    if(edition==="bags") return 20;
    return 0;
  }
  function startupCost(edition,guests){
    return ["pasta","waffle","pasta_waffle"].includes(edition)&&guests>=30&&guests<50?150:0;
  }
  function waffleUnitPrice(formData){
    const extra=formData?getValue(formData,"waffle_extra"):"none";
    return extra&&extra!=="none"?16:12;
  }
  function calculatePrice(edition,guests,formData=null){
    if(!guests||guests<minimumFor(edition)) return null;
    const startup=startupCost(edition,guests);
    if(edition==="pasta") return guests*15+startup;
    if(edition==="waffle") return guests*waffleUnitPrice(formData)+startup;
    if(edition==="candy") return guests*10;
    if(edition==="pasta_waffle") return guests*(15+waffleUnitPrice(formData))+startup;
    return null;
  }
  function formatPrice(price){
    if(price===null||price===undefined||Number.isNaN(price)) return "Prijs op maat";
    return new Intl.NumberFormat("nl-BE",{style:"currency",currency:"EUR",minimumFractionDigits:2,maximumFractionDigits:2}).format(price);
  }
  function updateEstimate(){
    if(!guestsInput) return;
    const edition=getSelectedEdition(),guests=Number(guestsInput.value||0),formData=form?new FormData(form):null;
    const minimum=minimumFor(edition),price=calculatePrice(edition,guests,formData);
    const estimateElements=[$("#estimated-price"),$("#price-estimate"),$(".estimated-price"),$(".price-estimate")].filter(Boolean);
    const label=!edition?"Kies eerst een concept":guests<=0?"Vul het aantal personen in":guests<minimum?`Minimum ${minimum} personen`:formatPrice(price);
    estimateElements.forEach(el=>el.textContent=label);
    const breakdown=$("#price-estimate-breakdown");
    if(!breakdown) return;
    if(!edition||guests<=0){breakdown.textContent="Kies een concept en vul het aantal gasten in voor een prijsindicatie.";return;}
    if(guests<minimum){breakdown.textContent=`Voor dit concept geldt een minimum van ${minimum} personen.`;return;}
    const startup=startupCost(edition,guests),lines=[];
    if(edition==="pasta") lines.push(`Pasta: ${guests} × €15,00 = ${formatPrice(guests*15)}`);
    if(edition==="waffle") lines.push(`Waffle: ${guests} × €${waffleUnitPrice(formData)},00 = ${formatPrice(guests*waffleUnitPrice(formData))}`);
    if(edition==="candy") lines.push(`Candy: ${guests} × €10,00 = ${formatPrice(guests*10)} (500 g snoep per persoon)`);
    if(edition==="pasta_waffle") lines.push(`Pasta + Waffle: ${guests} × €${15+waffleUnitPrice(formData)},00 = ${formatPrice(guests*(15+waffleUnitPrice(formData)))}`);
    lines.push(startup?`Opstartkost: ${formatPrice(startup)} (30–49 personen)`:"Opstartkost: €0,00");
    lines.push(`Totaalindicatie: ${formatPrice(price)}`);
    breakdown.textContent=lines.join("\n");
  }
  if(form){form.addEventListener("input",updateEstimate);form.addEventListener("change",updateEstimate);}

  /* =========================================================
     TIJDEN UITHALEN  /* =========================================================
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

        waffle_options: [],

        waffle_extra:
          (edition === "waffle" || edition === "pasta_waffle") ? getValue(formData, "waffle_extra") : null,

        waffle_drink_quantity: null,

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
           FORM VALIDATIE
        ------------------------------------------------- */

        if (!form.checkValidity()) {
          form.reportValidity();
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

          const quoteForEmail = buildQuote(formData);
          const notificationResponse = await fetch("https://humiebear.vercel.app/api/send-notification", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify({ type: "quote", data: quoteForEmail })
          });

          if (!notificationResponse.ok) {
            console.error("Hummie Bear email notification failed:", await notificationResponse.text());
          }


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
