document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.querySelector('.menu-toggle');
  const mainNav = document.querySelector('.main-nav');

  if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', () => {
      const open = mainNav.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.querySelectorAll('.main-nav a').forEach((link) => link.addEventListener('click', () => {
      mainNav.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
    }));
  }

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
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    dateInput.min = today.toISOString().split('T')[0];
  }

  const editionOptions = document.querySelector('.edition-options');
  const waffleFields = document.getElementById('waffle-fields');
  const candyFields = document.getElementById('candy-fields');
  const bagFields = document.getElementById('bag-fields');
  const guestsInput = document.querySelector('input[name="guests"]');
  const estimateBox = document.getElementById('live-estimate');
  const estimateTitle = document.getElementById('estimate-title');
  const estimateAmount = document.getElementById('estimate-amount');
  const estimateNote = document.getElementById('estimate-note');

  const minimumFor = (selected) => (selected === 'Hummie Bear Candy Edition' || selected === 'Beide editions' ? 35 : 20);
  const selectedEdition = () => document.querySelector('input[name="editions"]:checked')?.value || '';
  const startupCost = (selected, guests) => {
    if (!selected || !guests || guests < minimumFor(selected)) return null;
    return guests < 50 ? 150 : 0;
  };

  function updateMinimum() {
    if (!guestsInput) return;
    const selected = selectedEdition();
    const min = minimumFor(selected);
    guestsInput.min = String(min);
    const helper = guestsInput.closest('label')?.querySelector('small');
    if (helper) {
      helper.textContent = selected === 'Hummie Bear Candy Edition'
        ? 'Minimum voor Candy Edition: 35 personen.'
        : selected === 'Beide editions'
          ? 'Minimum voor Candy + Waffle: 35 personen.'
          : 'Minimum: 20 personen.';
    }
  }

  function updateEstimate() {
    if (!estimateBox || !estimateTitle || !estimateAmount || !estimateNote) return;
    const selected = selectedEdition();
    const guests = Number(guestsInput?.value || 0);
    const bag = !!document.querySelector('input[name="waffle_options"][value="Snoepzakje + €5 p.p."]:checked');
    const soda = !!document.querySelector('input[name="waffle_options"][value="Frisdranken"]:checked');

    if (!selected) {
      estimateBox.hidden = true;
      return;
    }
    estimateBox.hidden = false;
    if (!guests || guests < minimumFor(selected)) {
      estimateTitle.textContent = 'Indicatie van je formule';
      estimateAmount.textContent = '—';
      estimateNote.textContent = `Vul minstens ${minimumFor(selected)} personen in om een richtprijs te zien.`;
      return;
    }

    const start = startupCost(selected, guests) || 0;
    let total = 0;
    let label = '';
    let note = '';

    if (selected === 'Hummie Bear Waffle Edition') {
      total = guests * 20 + start + (bag ? guests * 5 : 0);
      label = 'Richtprijs Waffle Edition';
      note = `${guests} × €20 p.p.${start ? ' + €150 opstartkost' : ' + geen opstartkost'}${bag ? ' + €5 p.p. snoepzakje' : ''}${soda ? ' · frisdrank apart' : ''}.`;
    } else if (selected === 'Hummie Bear Candy Edition') {
      total = guests * 10 + start;
      label = 'Richtprijs Candy Edition';
      note = `${guests} × €10 p.p.${start ? ' + €150 opstartkost' : ' + geen opstartkost'} · 500 gram snoep p.p.`;
    } else if (selected === 'Beide editions') {
      total = guests * 29.5 + start;
      label = 'Richtprijs Candy + Waffle';
      note = `${guests} × €29,50 p.p.${start ? ' + €150 opstartkost' : ' + geen opstartkost'} · 2 uur.`;
    } else {
      label = 'Snoepzakken op maat';
      note = start ? '€150 opstartkost · prijs per snoepzak wordt op maat berekend.' : 'Vanaf 50 personen geen opstartkost · prijs per snoepzak wordt op maat berekend.';
    }

    estimateTitle.textContent = label;
    estimateAmount.textContent = selected === 'Snoepzakken op maat' ? 'Offerte op maat' : `± €${total.toFixed(2).replace('.', ',')}`;
    estimateNote.textContent = note;
  }

  if (editionOptions) {
    editionOptions.innerHTML = `
      <label class="edition-option"><input type="radio" name="editions" value="Hummie Bear Waffle Edition"><span><strong>Waffle Edition</strong><small>Vanaf 20 personen · €20 p.p. · 2 uur · €150 opstart 20–49 · vanaf 50 geen opstart</small></span></label>
      <label class="edition-option"><input type="radio" name="editions" value="Hummie Bear Candy Edition"><span><strong>Candy Edition</strong><small>Vanaf 35 personen · €10 p.p. · 500 gram p.p. · €150 opstart 35–49 · vanaf 50 geen opstart</small></span></label>
      <label class="edition-option"><input type="radio" name="editions" value="Beide editions"><span><strong>Candy + Waffle</strong><small>Vanaf 35 personen · €29,50 p.p. · 2 uur · €150 opstart 35–49 · vanaf 50 geen opstart</small></span></label>
      <label class="edition-option"><input type="radio" name="editions" value="Snoepzakken op maat"><span><strong>Snoepzakken op maat</strong><small>Vanaf 20 personen · 2 uur · prijs op maat · €150 opstart 20–49 · vanaf 50 geen opstart</small></span></label>`;
  }

  function updatePricingCards() {
    const cards = [...document.querySelectorAll('#prijzen .price-card')];
    if (cards.length < 3) return;
    cards[0].querySelector('h3').textContent = '€10 p.p. • 500 gram';
    cards[0].querySelector('.price').textContent = '2 uur · vanaf 35';
    cards[0].querySelector('p').textContent = '65 soorten snoep in onze kraam. Bezoekers kunnen tijdens de catering hun zakje bijvullen binnen de afgesproken totale hoeveelheid.';
    cards[0].querySelector('ul').innerHTML = '<li>Vanaf 35 personen</li><li>€10 per persoon</li><li>500 gram snoep p.p.</li><li>65 soorten</li><li>€150 opstart 35–49</li><li>Vanaf 50 geen opstartkost</li><li>Vegan snoep mogelijk</li>';
    cards[1].querySelector('h3').textContent = '€20 p.p. all-in';
    cards[1].querySelector('.price').textContent = '2 uur';
    cards[1].querySelector('p').textContent = 'Lollywafels, milkshakes, ijs, koffie en warme chocomelk inbegrepen.';
    cards[1].querySelector('ul').innerHTML = '<li>Vanaf 20 personen</li><li>€20 per persoon</li><li>2 uur all-in</li><li>Koffie inbegrepen</li><li>Warme chocomelk inbegrepen</li><li>IJs inbegrepen</li><li>Frisdrank: €2 per blik</li><li>Snoepzakje +€5 p.p. vanaf 20</li><li>€150 opstart 20–49</li><li>Vanaf 50 geen opstartkost</li>';
    cards[2].querySelector('h3').textContent = '€29,50 p.p.';
    cards[2].querySelector('.price').textContent = '2 uur';
    cards[2].querySelector('p').textContent = 'Waffle Edition + Candy Edition als één complete zoete beleving.';
    cards[2].querySelector('ul').innerHTML = '<li>Vanaf 35 personen</li><li>€29,50 per persoon</li><li>2 uur</li><li>Waffle all-in</li><li>Candy met 500 gram p.p.</li><li>€150 opstart 35–49</li><li>Vanaf 50 geen opstartkost</li><li>Vegan snoep mogelijk</li>';
    const note = document.querySelector('.pricing-note');
    if (note) note.textContent = 'Candy: vanaf 35 personen. €150 opstartkost van 35–49 personen; vanaf 50 geen opstartkost. Waffle: vanaf 20 personen. €150 opstartkost van 20–49 personen; vanaf 50 geen opstartkost. Snoepzakje bij Waffle: +€5 p.p. vanaf 20 personen.';
  }
  updatePricingCards();

  if (document.title.includes('Candy Edition')) {
    const heroLead = document.querySelector('.hero-copy .hero-lead');
    if (heroLead && !document.querySelector('.price-note')) {
      const note = document.createElement('p');
      note.className = 'price-note';
      note.innerHTML = '<strong>€10 per persoon</strong> · vanaf 35 personen · 500 gram snoep p.p. · 2 uur · €150 opstart 35–49 · vanaf 50 geen opstartkost';
      heroLead.insertAdjacentElement('afterend', note);
    }
  }

  function updateEditionPanels() {
    const selected = selectedEdition();
    const waffle = selected === 'Hummie Bear Waffle Edition' || selected === 'Beide editions';
    const candy = selected === 'Hummie Bear Candy Edition' || selected === 'Beide editions';
    const bags = selected === 'Snoepzakken op maat';
    updateMinimum();

    if (waffleFields) {
      waffleFields.hidden = !waffle;
      waffleFields.innerHTML = `<h4>Waffle Edition — €20 p.p. all-in</h4><p class="extra-intro"><strong>Vanaf 20 personen, 2 uur.</strong> Lollywafels, milkshakes, ijs, koffie en warme chocomelk inbegrepen. €150 opstartkost van 20–49 personen; vanaf 50 geen opstartkost.</p><div class="check-grid"><label class="check-line"><input type="checkbox" name="waffle_options" value="Frisdranken">Frisdranken <span>€2,00 per blik</span></label><label class="check-line"><input type="checkbox" name="waffle_options" value="Snoepzakje + €5 p.p.">Snoepzakje <span>+ €5,00 p.p. vanaf 20 personen</span></label></div>`;
    }

    if (candyFields) {
      candyFields.hidden = !candy;
      candyFields.innerHTML = `<h4>Candy Edition — €10 p.p. · 2 uur</h4><p class="extra-intro"><strong>Vanaf 35 personen · 500 gram snoep per persoon.</strong> Bij 35 personen voorzien we bijvoorbeeld 17,5 kg snoep in totaal.</p><p class="extra-intro"><strong>Opstartkost:</strong> €150 van 35–49 personen. Vanaf 50 personen vervalt de opstartkost.</p><label class="check-line"><input type="checkbox" name="candy_options" value="Vegan snoep gewenst">Vegan snoep gewenst</label>`;
    }

    if (bagFields) {
      bagFields.hidden = !bags;
      bagFields.innerHTML = `<h4>Snoepzakken op maat — 2 uur</h4><p class="extra-intro"><strong>Vanaf 20 personen.</strong> Je geeft aantallen en voorkeuren door; wij maken daarna een voorstel per snoepzak.</p><p class="extra-intro"><strong>Opstartkost:</strong> €150 van 20–49 personen. Vanaf 50 geen opstartkost.</p><div class="bag-grid"><label>Aantal snoepzakken *<select name="bag_quantity"><option value="">Kies een aantal</option><option>25–50</option><option>51–100</option><option>101–150</option><option>150+</option></select></label><label>Samenstelling *<select name="bag_composition"><option value="">Maak een keuze</option><option>Hummie Bear stelt een mix samen</option><option>Ik geef zelf voorkeuren door</option></select></label></div><label>Welke snoepen wil je graag?<small>Specifieke snoepen, kleuren of smaken mag je hier doorgeven.</small><textarea name="bag_sweets" rows="3" placeholder="bv. kikkers, zure matten, kersen..."></textarea></label><label>Naam / tekst op de snoepzakken<input type="text" name="bag_personalization" placeholder="bv. Chiro De Speelclub · Zomerfeest 2027"></label><p class="extra-note"><strong>Prijs op maat:</strong> grotere aantallen of speciale samenstellingen bespreken we persoonlijk.</p>`;
      const quantity = bagFields.querySelector('[name="bag_quantity"]');
      const composition = bagFields.querySelector('[name="bag_composition"]');
      if (bags) { quantity?.setAttribute('required',''); composition?.setAttribute('required',''); }
    }

    document.querySelectorAll('input[name="waffle_options"]').forEach((input) => input.addEventListener('change', updateEstimate));
    updateEstimate();
  }

  document.querySelectorAll('input[name="editions"]').forEach((input) => input.addEventListener('change', updateEditionPanels));
  guestsInput?.addEventListener('input', updateEstimate);
  guestsInput?.addEventListener('change', updateEstimate);
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
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const selected = selectedEdition();
      const guests = Number(guestsInput?.value || 0);
      const min = minimumFor(selected);
      if (!selected) { showToast('Kies eerst welke Hummie Bear-formule je wilt aanvragen.'); return; }
      if (guests < min) { showToast(`Voor deze formule heb je minstens ${min} personen nodig.`); guestsInput?.focus(); return; }

      const button = form.querySelector('.submit-button');
      const original = button?.innerHTML;
      if (button) { button.disabled = true; button.innerHTML = 'Aanvraag versturen…'; }
      try {
        const response = await fetch('https://formspree.io/f/xnpqeljn', { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error('Form submission failed');
        form.reset();
        updateEditionPanels();
        showToast('Bedankt! Je offerteaanvraag is goed verstuurd.');
      } catch (error) {
        console.error(error);
        showToast('Er ging iets mis. Probeer opnieuw of mail hummiebearbusiness@gmail.com.');
      } finally {
        if (button) { button.disabled = false; button.innerHTML = original; }
      }
    });
  }

  document.querySelectorAll('.edition-card').forEach((card) => {
    card.addEventListener('mousemove', (event) => {
      if (window.innerWidth < 900) return;
      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      card.style.transform = `perspective(900px) rotateX(${((y - rect.height / 2) / (rect.height / 2)) * -1.2}deg) rotateY(${((x - rect.width / 2) / (rect.width / 2)) * 1.2}deg) translateY(-6px)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });

  document.querySelectorAll('a[href^="#"]').forEach((link) => link.addEventListener('click', (event) => {
    const id = link.getAttribute('href');
    const target = id && document.querySelector(id);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
});