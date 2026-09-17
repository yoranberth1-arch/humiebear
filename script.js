const menuToggle = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('.main-nav');

if (menuToggle && mainNav) {
  menuToggle.addEventListener('click', () => {
    const open = mainNav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  document.querySelectorAll('.main-nav a').forEach((a) => {
    a.addEventListener('click', () => {
      mainNav.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// Maak de zichtbare gewichtsvermeldingen consequent: 500 gram.
const textWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
const textNodes = [];
let currentNode;
while ((currentNode = textWalker.nextNode())) textNodes.push(currentNode);
textNodes.forEach((node) => {
  node.nodeValue = node.nodeValue
    .replaceAll('0,5 kg', '500 gram')
    .replaceAll('0,5 KG', '500 GRAM')
    .replaceAll('0.5 kg', '500 gram')
    .replaceAll('0.5 KG', '500 GRAM');
});

document.querySelectorAll('meta[content]').forEach((meta) => {
  meta.content = meta.content
    .replaceAll('0,5 kg', '500 gram')
    .replaceAll('0,5 KG', '500 GRAM')
    .replaceAll('0.5 kg', '500 gram')
    .replaceAll('0.5 KG', '500 GRAM');
});

const dateInput = document.querySelector('input[name="date"]');
if (dateInput) {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  dateInput.min = d.toISOString().split('T')[0];
}

const editionOptions = document.querySelector('.edition-options');
const waffleFields = document.getElementById('waffle-fields');
const candyFields = document.getElementById('candy-fields');
const bagFields = document.getElementById('bag-fields');
const guestsInput = document.querySelector('input[name="guests"]');

if (editionOptions) {
  editionOptions.innerHTML = `
    <label class="edition-option">
      <input type="radio" name="editions" value="Hummie Bear Waffle Edition">
      <span><strong>Waffle Edition</strong><small>Vanaf 20 personen • €20 p.p. • 2 uur • €150 opstart onder 30</small></span>
    </label>
    <label class="edition-option">
      <input type="radio" name="editions" value="Hummie Bear Candy Edition">
      <span><strong>Candy Edition</strong><small>Vanaf 20 personen • €10 p.p. • 500 gram p.p. • €150 opstart onder 35 • vanaf 50 geen opstart</small></span>
    </label>
    <label class="edition-option">
      <input type="radio" name="editions" value="Beide editions">
      <span><strong>Candy + Waffle</strong><small>Vanaf 20 personen • €29,50 p.p. • 2 uur</small></span>
    </label>
    <label class="edition-option">
      <input type="radio" name="editions" value="Snoepzakken op maat">
      <span><strong>Snoepzakken op maat</strong><small>Vanaf 20 personen • prijs op maat</small></span>
    </label>
  `;
}

const editionInputs = [...document.querySelectorAll('input[name="editions"]')];

function updatePricingCards() {
  const cards = document.querySelectorAll('#prijzen .price-card');
  if (!cards.length) return;

  // Candy card
  const candyCard = cards[0];
  const candyTitle = candyCard?.querySelector('h3');
  const candyPrice = candyCard?.querySelector('.price');
  const candyParagraph = candyCard?.querySelector('p');
  const candyList = candyCard?.querySelector('ul');
  if (candyTitle) candyTitle.textContent = '€10 p.p. • 500 gram snoep';
  if (candyPrice) candyPrice.textContent = '€10 p.p.';
  if (candyParagraph) candyParagraph.textContent = '65 soorten snoep in onze kraam. Bezoekers mogen hun zakje zo vaak komen vullen als ze willen, binnen de totale afgesproken hoeveelheid.';
  if (candyList) {
    candyList.innerHTML = `
      <li>€10 per persoon</li>
      <li>500 gram snoep p.p.</li>
      <li>65 soorten</li>
      <li>Vegan snoep mogelijk</li>
      <li>Vanaf 20 personen</li>
      <li>€150 opstart onder 35 personen</li>
      <li>Vanaf 50 personen geen opstartkost</li>
    `;
  }

  // Combo card: €20 + €10 = €30, met kleine combinatiekorting.
  const comboCard = cards[cards.length - 1];
  const comboTitle = comboCard?.querySelector('h3');
  const comboPrice = comboCard?.querySelector('.price');
  const comboParagraph = comboCard?.querySelector('p');
  const comboList = comboCard?.querySelector('ul');
  if (comboTitle) comboTitle.textContent = 'Candy + Waffle';
  if (comboPrice) comboPrice.textContent = '€29,50 p.p.';
  if (comboParagraph) comboParagraph.textContent = 'Waffle Edition + Candy Edition samen als één complete zoete cateringformule voor 2 uur.';
  if (comboList) {
    comboList.innerHTML = `
      <li>Vanaf 20 personen</li>
      <li>€29,50 per persoon</li>
      <li>Waffle All-in voor 2 uur</li>
      <li>Candy catering met 500 gram p.p.</li>
      <li>€0,50 combinatievoordeel p.p.</li>
      <li>Vegan snoep mogelijk</li>
    `;
  }
}

updatePricingCards();

// Prijs duidelijk zichtbaar maken op de Candy-pagina.
if (document.title.includes('Candy Edition')) {
  const heroLead = document.querySelector('.hero-copy .hero-lead');
  if (heroLead && !document.querySelector('.candy-price-note')) {
    const note = document.createElement('p');
    note.className = 'candy-price-note';
    note.innerHTML = '<strong>€10 per persoon</strong> • 500 gram snoep p.p. • €150 opstartkost onder 35 personen • vanaf 50 personen geen opstartkost';
    heroLead.insertAdjacentElement('afterend', note);
  }
}

function updateEditionPanels() {
  const selected = editionInputs.find((input) => input.checked)?.value || '';
  const waffle = selected === 'Hummie Bear Waffle Edition' || selected === 'Beide editions';
  const candy = selected === 'Hummie Bear Candy Edition' || selected === 'Beide editions';
  const bags = selected === 'Snoepzakken op maat';
  const guests = Number(guestsInput?.value || 0);

  if (waffleFields) {
    waffleFields.hidden = !waffle;
    waffleFields.innerHTML = `
      <h4>Waffle Edition — €20 p.p. all-in</h4>
      <p class="extra-intro"><strong>Vanaf 20 personen, 2 uur all-in.</strong> Lollywafels, milkshakes, ijs, koffie en warme chocomelk zijn inbegrepen. Bij minder dan 30 personen geldt €150 opstartkost; vanaf 30 personen vervalt die kost.</p>
      <div class="check-grid">
        <label class="check-line">
          <input type="checkbox" name="waffle_options" value="Frisdranken">
          Frisdranken <span>€2,00 per blik</span>
        </label>
        <label class="check-line">
          <input type="checkbox" name="waffle_options" value="Snoepzakje + €5 p.p." ${guests > 0 && guests < 30 ? 'disabled' : ''}>
          Snoepzakje <span>+ €5,00 p.p. vanaf 30 personen</span>
        </label>
      </div>
    `;
  }

  if (candyFields) {
    candyFields.hidden = !candy;
    candyFields.innerHTML = `
      <h4>Candy Edition — €10 p.p.</h4>
      <p class="extra-intro"><strong>Vanaf 20 personen • €10 per persoon • 500 gram snoep per persoon.</strong> Bijvoorbeeld: 35 personen = 17,5 kg snoep in onze kraam. Bezoekers kunnen tijdens de catering zo vaak hun zakje komen vullen als ze willen, binnen de totale afgesproken hoeveelheid.</p>
      <p class="extra-intro"><strong>Opstartkost:</strong> €150 onder 35 personen. Vanaf 50 personen vervalt de opstartkost.</p>
      <label class="check-line">
        <input type="checkbox" name="candy_options" value="Vegan snoep gewenst">
        Vegan snoep gewenst
      </label>
    `;
  }

  if (bagFields) {
    bagFields.hidden = !bags;
    bagFields.innerHTML = `
      <h4>Snoepzakken op maat</h4>
      <p class="extra-intro"><strong>Vanaf 20 personen.</strong> Stel je snoepzakken samen zoals jij ze wilt. Ideaal voor verjaardagen, Chiro, KSA, Scouts, scholen, sportverenigingen en andere groepen.</p>
      <div class="bag-grid">
        <label>Aantal snoepzakken *
          <select name="bag_quantity" required>
            <option value="">Kies een aantal</option>
            <option>25–50</option>
            <option>51–100</option>
            <option>101–150</option>
            <option>150+</option>
          </select>
        </label>
        <label>Hoe wil je de zak samenstellen? *
          <select name="bag_composition" required>
            <option value="">Maak een keuze</option>
            <option>Hummie Bear stelt een leuke mix samen</option>
            <option>Ik wil zelf aangeven welke snoepen erin komen</option>
          </select>
        </label>
      </div>
      <label>Welke snoepen wil je graag in de zakken?
        <small>Je mag specifieke snoepen, kleuren of smaken doorgeven.</small>
        <textarea name="bag_sweets" rows="3" placeholder="bv. Kikkers, zure matten, Happy Cherries, ..."></textarea>
      </label>
      <label>Naam / tekst voor op de snoepzakken
        <small>bv. Chiro De Speelclub • Zomerfeest 2027</small>
        <input type="text" name="bag_personalization" placeholder="bv. Chiro De Speelclub">
      </label>
      <p class="extra-note"><strong>Prijs op maat:</strong> bij grotere aantallen maken we een voorstel per snoepzak.</p>
    `;
  }
}

editionInputs.forEach((input) => input.addEventListener('change', updateEditionPanels));

if (guestsInput) {
  guestsInput.min = '20';
  guestsInput.addEventListener('input', () => {
    if (guestsInput.value !== '' && Number(guestsInput.value) < 20) {
      guestsInput.value = '20';
    }
    updateEditionPanels();
  });
}

updateEditionPanels();

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.remove('show'), 5000);
}

const form = document.getElementById('booking-form');
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const selected = editionInputs.find((input) => input.checked);
    if (!selected) {
      showToast('Kies eerst Waffle Edition, Candy Edition, beide of Snoepzakken op maat.');
      document.querySelector('.edition-options')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const guests = Number(guestsInput?.value || 0);
    if (guests < 20) {
      showToast('Hummie Bear komt vanaf 20 personen. Vul minstens 20 gasten in.');
      guestsInput?.focus();
      return;
    }

    const button = form.querySelector('.submit-button');
    const original = button?.innerHTML;
    if (button) {
      button.disabled = true;
      button.innerHTML = 'Aanvraag versturen…';
    }

    try {
      const response = await fetch('https://formspree.io/f/xnpqeljn', {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      });

      if (!response.ok) throw new Error('Form submission failed');
      form.reset();
      updateEditionPanels();
      showToast('Bedankt! Je offerteaanvraag is goed verstuurd.');
      setTimeout(() => document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    } catch (error) {
      console.error(error);
      showToast('Er ging iets mis. Probeer opnieuw of mail hummiebearbusiness@gmail.com.');
    } finally {
      if (button) {
        button.disabled = false;
        button.innerHTML = original;
      }
    }
  });
}

document.querySelectorAll('.edition-card').forEach((card) => {
  card.addEventListener('mousemove', (e) => {
    if (innerWidth < 900) return;
    const r = card.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    card.style.transform = `perspective(900px) rotateX(${((y - r.height / 2) / (r.height / 2)) * -1.5}deg) rotateY(${((x - r.width / 2) / (r.width / 2)) * 1.5}deg) translateY(-7px)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
  });
});

document.querySelectorAll('.booking-form input,.booking-form textarea,.booking-form select').forEach((field) => {
  field.addEventListener('focus', () => field.closest('label')?.classList.add('field-focused'));
  field.addEventListener('blur', () => field.closest('label')?.classList.remove('field-focused'));
});

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (e) => {
    const id = link.getAttribute('href');
    if (!id || id === '#') return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth' });
  });
});

const messageField = document.querySelector('textarea[name="message"]');
if (messageField) {
  messageField.placeholder = 'Wij organiseren een verjaardagsfeestje voor ongeveer 30 personen en willen graag de Waffle Edition...';
}
