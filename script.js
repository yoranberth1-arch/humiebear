const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector(".main-nav");

const form = document.getElementById("booking-form");
const toast = document.getElementById("toast");

const dateInput = document.querySelector('input[name="date"]');

const editionInputs = [
  ...document.querySelectorAll('input[name="editions"]')
];

const candyFields = document.getElementById("candy-fields");
const waffleFields = document.getElementById("waffle-fields");


/* =========================================
   MOBIEL MENU
========================================= */

menuToggle?.addEventListener("click", () => {

  const isOpen = mainNav.classList.toggle("open");

  menuToggle.setAttribute(
    "aria-expanded",
    isOpen ? "true" : "false"
  );

});


/* =========================================
   MENU SLUITEN NA KLIK
========================================= */

document
  .querySelectorAll(".main-nav a")
  .forEach((link) => {

    link.addEventListener("click", () => {

      mainNav.classList.remove("open");

      menuToggle?.setAttribute(
        "aria-expanded",
        "false"
      );

    });

  });


/* =========================================
   DATUM
========================================= */

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


/* =========================================
   EDITIONS
========================================= */

function getSelectedEditions() {

  return editionInputs
    .filter((input) => input.checked)
    .map((input) => input.value);

}


function updateEditionPanels() {

  const selected = getSelectedEditions();

  const candySelected =
    selected.includes("Hummie Bear Candy Edition") ||
    selected.includes("Beide editions");

  const waffleSelected =
    selected.includes("Hummie Bear Waffle Edition") ||
    selected.includes("Beide editions");


  if (candyFields) {
    candyFields.hidden = !candySelected;
  }


  if (waffleFields) {
    waffleFields.hidden = !waffleSelected;
  }

}


editionInputs.forEach((input) => {

  input.addEventListener("change", () => {

    const bothInput = editionInputs.find(
      (item) => item.value === "Beide editions"
    );

    const candyInput = editionInputs.find(
      (item) =>
        item.value === "Hummie Bear Candy Edition"
    );

    const waffleInput = editionInputs.find(
      (item) =>
        item.value === "Hummie Bear Waffle Edition"
    );


    /* Wanneer BEIDE wordt gekozen */
    if (
      input.value === "Beide editions" &&
      input.checked
    ) {

      if (candyInput) {
        candyInput.checked = true;
      }

      if (waffleInput) {
        waffleInput.checked = true;
      }

    }


    /* Wanneer een van de twee wordt uitgevinkt */
    if (
      input.value !== "Beide editions" &&
      !input.checked
    ) {

      if (bothInput) {
        bothInput.checked = false;
      }

    }


    /* Wanneer beide losse opties geselecteerd zijn */
    if (
      candyInput?.checked &&
      waffleInput?.checked
    ) {

      if (bothInput) {
        bothInput.checked = true;
      }

    }


    updateEditionPanels();

  });

});


updateEditionPanels();


/* =========================================
   MELDING
========================================= */

function showToast(message) {

  if (!toast) {
    return;
  }

  toast.textContent = message;

  toast.classList.add("show");

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {

    toast.classList.remove("show");

  }, 5000);

}


/* =========================================
   EDITION VALIDATIE
========================================= */

function editionsAreSelected() {

  return editionInputs.some(
    (input) => input.checked
  );

}


/* =========================================
   FORMULIER VERSTUREN
========================================= */

form?.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();


    /* Controleer edition */

    if (!editionsAreSelected()) {

      showToast(
        "Kies eerst Candy Edition, Waffle Edition of beide."
      );

      document
        .querySelector(".edition-selector")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });

      return;

    }


    const submitButton =
      form.querySelector(
        ".submit-button"
      );


    const originalButtonText =
      submitButton
        ? submitButton.innerHTML
        : "";


    if (submitButton) {

      submitButton.disabled = true;

      submitButton.innerHTML =
        "Aanvraag versturen…";

    }


    try {

      const response = await fetch(
        "https://formspree.io/f/xnpqeljn",
        {
          method: "POST",

          body: new FormData(form),

          headers: {
            Accept: "application/json"
          }
        }
      );


      if (!response.ok) {

        throw new Error(
          "Form submission failed"
        );

      }


      /* Formulier succesvol verzonden */

      form.reset();


      updateEditionPanels();


      showToast(
        "Bedankt! Je aanvraag is goed verstuurd. We nemen zo snel mogelijk contact op."
      );


    } catch (error) {

      console.error(error);


      showToast(
        "Er ging iets mis bij het versturen. Probeer opnieuw of mail ons via hummiebearbusiness@gmail.com."
      );

    } finally {

      if (submitButton) {

        submitButton.disabled = false;

        submitButton.innerHTML =
          originalButtonText;

      }

    }

  }
);
