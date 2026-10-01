(() => {
"use strict";

const PLANS = {
  sweet: { label: "Sweet Box", price: 19.95 },
  plus: { label: "Sweet Box Plus", price: 29.95 }
};

let selectedPlan = null;

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

function euro(value) {
  return new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(value);
}

function setMessage(message, type = "") {
  const el = $("#subscriptionMessage");
  if (!el) return;
  el.textContent = message;
  el.className = "sub-message" + (type ? " " + type : "");
}

function selectPlan(key) {
  const plan = PLANS[key];
  if (!plan) return;

  selectedPlan = key;

  $$("[data-plan-card]").forEach(card => {
    card.classList.toggle("is-selected", card.dataset.planCard === key);
  });

  $("#selectedPlanLabel").textContent = plan.label;
  $("#selectedPlanPrice").textContent = euro(plan.price) + " / maand";
  $("#checkoutPrice").textContent = euro(plan.price) + " / maand";

  document.querySelector("#voorkeuren")?.scrollIntoView({ behavior: "smooth", block: "start" });
  setMessage("");
}

$$("[data-select-plan]").forEach(button => {
  button.addEventListener("click", () => selectPlan(button.dataset.selectPlan));
});

$("#subscriptionForm")?.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!selectedPlan) {
    setMessage("Kies eerst een abonnement.", "error");
    document.querySelector("#abonnementen")?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  const form = event.currentTarget;
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const data = Object.fromEntries(new FormData(form).entries());
  const payload = {
    plan: selectedPlan,
    planName: PLANS[selectedPlan].label,
    monthlyPrice: PLANS[selectedPlan].price,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone || "",
    address: data.address,
    postalCode: data.postalCode,
    city: data.city,
    style: data.style,
    avoid: data.avoid || "",
    createdAt: new Date().toISOString()
  };

  try {
    localStorage.setItem("hummieBearSubscriptionDraftV1", JSON.stringify(payload));
  } catch (error) {
    console.warn("Subscription draft kon niet lokaal worden opgeslagen.", error);
  }

  /*
   * Veiligheidsgrens:
   * De echte Mollie subscription wordt NIET vanuit de browser aangemaakt.
   * Een backend moet hier een first payment starten en daarna, na een geldig
   * mandaat, de Mollie Subscription API aanroepen.
   */
  setMessage("Je gegevens zijn klaar. De beveiligde Mollie-betaalkoppeling moet nog op de backend worden aangesloten.", "pending");
});

document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("hummieBearSubscriptionDraftV1");
  if (!saved) return;
  try {
    const data = JSON.parse(saved);
    if (data.plan && PLANS[data.plan]) selectPlan(data.plan);
    const form = $("#subscriptionForm");
    if (!form) return;
    Object.entries(data).forEach(([key, value]) => {
      const field = form.elements[key];
      if (!field || key === "plan") return;
      if (field.type === "radio") {
        $$('[name="' + key + '"]').forEach(r => r.checked = r.value === value);
      } else if (field.type !== "checkbox") {
        field.value = value ?? "";
      }
    });
  } catch (error) {
    console.warn("Ongeldige opgeslagen abonnementgegevens.", error);
  }
});
})();