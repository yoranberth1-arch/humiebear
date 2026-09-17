/* =========================================================
   HUMMIE BEAR — INTERACTION SCRIPT
========================================================= */


/* =========================================================
   MOBIEL MENU
========================================================= */

const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector(".main-nav");

if (menuToggle && mainNav) {

  menuToggle.addEventListener("click", () => {

    const isOpen = mainNav.classList.toggle("open");

    menuToggle.setAttribute(
      "aria-expanded",
      isOpen ? "true" : "false"
    );

  });


  document
    .querySelectorAll(".main-nav a")
    .forEach((link) => {

      link.addEventListener("click", () => {

        mainNav.classList.remove("open");

        menuToggle.setAttribute(
          "aria-expanded",
          "false"
        );

      });

    });

}


/* =========================================================
   DATUM — GEEN DATUM IN HET VERLEDEN
========================================================= */

const dateInput =
  document.querySelector('input[name="date"]');

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
   EDITION SELECTIE
========================================================= */

const editionInputs = [
  ...document.querySelectorAll(
    'input[name="editions"]'
  )
];

const candyFields =
  document.getElementById("candy-fields");

const waffleFields =
  document.getElementById("waffle-fields");


function selectedEditions() {

  return editionInputs
    .filter((input) => input.checked)
    .map((input) => input.value);

}


function updateEditionPanels() {

  const selected = selectedEditions();

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


  if (candyFields) {
    candyFields.hidden = !candySelected;
  }


  if (waffleFields) {
    waffleFields.hidden = !waffleSelected;
  }

}


editionInputs.forEach((input) => {

  input.addEventListener(
    "change",
    () => {

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


      if (
        input.value ===
          "Beide editions" &&
        input.checked
      ) {

        if (candyInput) {
          candyInput.checked = true;
        }

        if (waffleInput) {
          waffleInput.checked = true;
        }

      }


      if (
        input.value !==
          "Beide editions" &&
        !input.checked
      ) {

        if (bothInput) {
          bothInput.checked = false;
        }

      }


      if (
        candyInput?.checked &&
        waffleInput?.checked
      ) {

        if (bothInput) {
          bothInput.checked = true;
        }

      }


      updateEditionPanels();

    }
  );

});


updateEditionPanels();


/* =========================================================
   TOAST / MELDING
========================================================= */

function showToast(message) {

  const toast =
    document.getElementById("toast");


  if (!toast) {
    return;
  }


  toast.textContent = message;

  toast.classList.add("show");


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
   FORMULIER
========================================================= */

const form =
  document.getElementById(
    "booking-form"
  );


if (form) {

  form.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();


      if (
        !editionInputs.some(
          (input) => input.checked
        )
      ) {

        showToast(
          "Kies eerst Candy Edition, Waffle Edition of beide."
        );

        document
          .querySelector(
            ".edition-selector"
          )
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

      const originalText =
        submitButton
          ? submitButton.innerHTML
          : "";

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = "Aanvraag versturen…";
      }


      try {

        const response =
          await fetch(
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
          throw new Error("Form submission failed");
        }

        form.reset();
        updateEditionPanels();

        showToast(
          "Bedankt! Je aanvraag is goed verstuurd."
        );

        setTimeout(() => {
          document
            .querySelector("#contact")
            ?.scrollIntoView({
              behavior: "smooth",
              block: "start"
            });
        }, 300);

      } catch (error) {

        console.error("Form error:", error);

        showToast(
          "Er ging iets mis. Probeer opnieuw of mail ons via hummiebearbusiness@gmail.com."
        );

      } finally {

        if (submitButton) {
          submitButton.disabled = false;
          submitButton.innerHTML = originalText;
        }

      }

    }
  );

}


/* =========================================================
   INTERACTIEVE EDITION-KAARTEN
========================================================= */

document
  .querySelectorAll(".edition-card")
  .forEach((card) => {

    card.addEventListener(
      "mousemove",
      (event) => {

        if (window.innerWidth < 900) {
          return;
        }

        const rect = card.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX =
          ((y - centerY) / centerY) * -1.5;

        const rotateY =
          ((x - centerX) / centerX) * 1.5;

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
        card.style.transform = "";
      }
    );

  });


/* =========================================================
   FOCUS EFFECT OP FORMULIER
========================================================= */

document
  .querySelectorAll(
    ".booking-form input, .booking-form textarea, .booking-form select"
  )
  .forEach((field) => {

    field.addEventListener(
      "focus",
      () => {
        field.closest("label")?.classList.add("field-focused");
      }
    );

    field.addEventListener(
      "blur",
      () => {
        field.closest("label")?.classList.remove("field-focused");
      }
    );

  });


/* =========================================================
   SMOOTH SCROLL VOOR INTERNE LINKS
========================================================= */

document
  .querySelectorAll('a[href^="#"]')
  .forEach((link) => {

    link.addEventListener(
      "click",
      (event) => {

        const targetId = link.getAttribute("href");

        if (!targetId || targetId === "#") {
          return;
        }

        const target = document.querySelector(targetId);

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

  });
