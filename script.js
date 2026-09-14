const toggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav");


// Mobiel menu
toggle?.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("open");

  toggle.setAttribute(
    "aria-expanded",
    isOpen ? "true" : "false"
  );
});


// Menu sluiten wanneer op een link wordt geklikt
document.querySelectorAll(".nav a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("open");

    toggle?.setAttribute(
      "aria-expanded",
      "false"
    );
  });
});


// Datumveld: geen datum uit het verleden toestaan
const dateInput = document.querySelector(
  'input[name="date"]'
);

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


// Formulier
const form = document.getElementById(
  "booking-form"
);

const toast = document.getElementById(
  "toast"
);


// Formulier versturen naar Formspree
form?.addEventListener("submit", async (event) => {

  event.preventDefault();

  const button = form.querySelector(
    'button[type="submit"]'
  );

  const originalText = button.innerHTML;

  button.disabled = true;

  button.innerHTML =
    "Versturen…";


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


    // Formulier leegmaken
    form.reset();


    // Succesmelding
    toast.textContent =
      "Bedankt! Je aanvraag is goed verstuurd.";

    toast.classList.add("show");


  } catch (error) {

    console.error(error);


    toast.textContent =
      "Er ging iets mis. Probeer opnieuw of mail ons rechtstreeks.";

    toast.classList.add("show");

  } finally {

    button.disabled = false;

    button.innerHTML =
      originalText;


    setTimeout(() => {

      toast.classList.remove(
        "show"
      );

    }, 5000);

  }

});
