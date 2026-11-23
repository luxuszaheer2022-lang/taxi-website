// ===== Buchung: Formular in 5 Schritten =====
(function () {
  const form = document.getElementById('bk-form');
  const steps = [...form.querySelectorAll('.bk-step[data-step]:not([data-step="done"])')];
  const doneStep = form.querySelector('.bk-step[data-step="done"]');
  const TOTAL = steps.length;

  const counter = document.getElementById('bk-counter');
  const bar = document.getElementById('bk-progress-bar');
  const asideItems = [...document.querySelectorAll('.bk-steps li')];
  const nav = document.getElementById('bk-nav');
  const backBtn = document.getElementById('bk-back');
  const nextBtn = document.getElementById('bk-next');

  const $ = (id) => document.getElementById(id);
  const fVon = $('f-von');
  const fNach = $('f-nach');
  const fRoute = $('f-route');
  const fDatum = $('f-datum');
  const fZeit = $('f-zeit');
  const fPersonen = $('f-personen');
  const routesBox = $('bk-routes');
  const chipsBox = $('bk-route-chips');
  const priceBox = $('bk-route-price');
  const flightBox = $('bk-flight');

  const ROUTES = window.LT_ROUTES || [];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let current = 1;
  let maxReached = 1;

  // ---------- Hilfen ----------
  const artValue = () => (form.querySelector('input[name="Art der Fahrt"]:checked') || {}).value || '';

  function isoDate(d) {
    const z = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
  }
  const today = isoDate(new Date());
  fDatum.min = today;

  function formatDate(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  function setError(name, msg) {
    const el = form.querySelector(`[data-error="${name}"]`);
    if (el) el.textContent = msg || '';
    const input = form.querySelector(`[name="${name}"]`);
    const field = input && input.closest('.bk-field');
    if (field) field.classList.toggle('has-error', !!msg);
  }

  // ---------- Schritt anzeigen ----------
  function show(n, direction = 1) {
    current = n;
    maxReached = Math.max(maxReached, n);

    steps.forEach(s => {
      const active = Number(s.dataset.step) === n;
      s.hidden = !active;
      s.classList.remove('is-entering', 'from-left');
      if (active && !reduceMotion) {
        void s.offsetWidth;
        s.classList.add('is-entering');
        if (direction < 0) s.classList.add('from-left');
      }
    });

    counter.textContent = `Schritt ${n} von ${TOTAL}`;
    bar.style.width = `${(n / TOTAL) * 100}%`;

    asideItems.forEach(li => {
      const i = Number(li.dataset.goto);
      li.classList.toggle('is-current', i === n);
      li.classList.toggle('is-done', i < n || (i <= maxReached && i !== n));
      if (i === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });

    backBtn.classList.toggle('is-hidden', n === 1);
    nextBtn.textContent = n === TOTAL ? 'Anfrage senden' : 'Weiter';

    if (n === 2) updateRouteUI();
    if (n === 3) flightBox.hidden = artValue() !== 'Flughafentransfer';
    if (n === TOTAL) renderSummary();

    // Fokus auf das erste Feld (nicht auf dem Handy, sonst springt die Tastatur auf)
    const first = steps[n - 1].querySelector('input:not([type="hidden"]):not([type="radio"]), textarea');
    if (first && window.matchMedia('(hover: hover)').matches) setTimeout(() => first.focus({ preventScroll: true }), 50);

    steps[n - 1].closest('.bk-stage').scrollTop = 0;
  }

  // ---------- Prüfen ----------
  function validate(n) {
    let ok = true;
    const fail = (name, msg) => { setError(name, msg); ok = false; };

    if (n === 1) {
      setError('Art der Fahrt', '');
      if (!artValue()) fail('Art der Fahrt', 'Bitte wählen Sie eine Art der Fahrt.');
    }
    if (n === 2) {
      setError('Von', ''); setError('Nach', '');
      if (!fVon.value.trim()) fail('Von', 'Bitte geben Sie den Abholort an.');
      if (!fNach.value.trim()) fail('Nach', 'Bitte geben Sie das Ziel an.');
    }
    if (n === 3) {
      setError('Datum', ''); setError('Uhrzeit', '');
      if (!fDatum.value) fail('Datum', 'Bitte wählen Sie ein Datum.');
      else if (fDatum.value < today) fail('Datum', 'Das Datum liegt in der Vergangenheit.');
      if (!fZeit.value) fail('Uhrzeit', 'Bitte wählen Sie eine Uhrzeit.');
    }
    if (n === 4) {
      const name = $('f-name'), tel = $('f-tel'), mail = $('f-mail');
      setError('Name', ''); setError('Telefon', ''); setError('email', '');
      if (!name.value.trim()) fail('Name', 'Bitte geben Sie Ihren Namen an.');
      const digits = tel.value.replace(/\D/g, '');
      if (digits.length < 6) fail('Telefon', 'Bitte geben Sie eine Telefonnummer an, unter der wir Sie erreichen.');
      if (mail.value.trim() && !mail.checkValidity()) fail('email', 'Diese E-Mail-Adresse sieht nicht vollständig aus.');
    }

    if (!ok) {
      const firstErr = steps[n - 1].querySelector('.has-error input, .has-error textarea');
      if (firstErr) firstErr.focus();
    }
    return ok;
  }

  function next() {
    if (!validate(current)) return;
    if (current < TOTAL) show(current + 1, 1);
    else submit();
  }

  function back() {
    if (current > 1) show(current - 1, -1);
  }

  nextBtn.addEventListener('click', next);
  backBtn.addEventListener('click', back);

  asideItems.forEach(li => li.addEventListener('click', () => {
    const i = Number(li.dataset.goto);
    if (i < current || i <= maxReached) show(i, i < current ? -1 : 1);
  }));

  // Enter = weiter (außer im Textfeld)
  form.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') {
      e.preventDefault();
      next();
    }
  });
  form.addEventListener('submit', (e) => { e.preventDefault(); next(); });

  // ---------- Schritt 1: Auswahl springt direkt weiter ----------
  form.querySelectorAll('input[name="Art der Fahrt"]').forEach(r => {
    r.addEventListener('change', () => {
      setError('Art der Fahrt', '');
      if (r.value !== 'Feste Strecke') clearRoute();
      setTimeout(() => { if (current === 1) show(2, 1); }, 260);
    });
  });

  // ---------- Schritt 2: feste Strecken ----------
  ROUTES.forEach(route => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'bk-route-chip';
    b.dataset.route = route.id;
    b.setAttribute('aria-pressed', 'false');
    b.innerHTML = `${route.von} ${route.arrow} ${route.nach} <small>${route.price}</small>`;
    b.addEventListener('click', () => applyRoute(route.id));
    chipsBox.appendChild(b);
  });

  function applyRoute(id) {
    const route = ROUTES.find(r => r.id === id);
    if (!route) return;
    fVon.value = route.von;
    fNach.value = route.nach;
    fRoute.value = `${route.von} ${route.arrow} ${route.nach} (${route.price})`;
    setError('Von', ''); setError('Nach', '');
    chipsBox.querySelectorAll('.bk-route-chip').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.route === id)));
    priceBox.innerHTML = `Festpreis ${route.price} <span>· ${route.km} km · Sie können Abholort und Ziel noch genauer angeben.</span>`;
    priceBox.hidden = false;
  }

  function clearRoute() {
    fRoute.value = '';
    priceBox.hidden = true;
    chipsBox.querySelectorAll('.bk-route-chip').forEach(c => c.setAttribute('aria-pressed', 'false'));
  }

  function updateRouteUI() {
    routesBox.hidden = artValue() !== 'Feste Strecke';
  }

  // Wer die Stadt im Feld verändert, verlässt die feste Strecke
  [fVon, fNach].forEach(input => input.addEventListener('input', () => {
    setError(input.name, '');
    if (!fRoute.value) return;
    const route = ROUTES.find(r => fRoute.value.startsWith(`${r.von} ${r.arrow} ${r.nach}`));
    const stillMatches = route
      && fVon.value.toLowerCase().includes(route.von.toLowerCase())
      && fNach.value.toLowerCase().includes(route.nach.toLowerCase().split(' ')[0]);
    if (!stillMatches) clearRoute();
  }));

  const swapBtn = $('bk-swap');
  swapBtn.addEventListener('click', () => {
    [fVon.value, fNach.value] = [fNach.value, fVon.value];
    swapBtn.classList.toggle('is-spun');
    if (fRoute.value) {
      const route = ROUTES.find(r => r.von === fVon.value && r.nach === fNach.value)
        || ROUTES.find(r => r.arrow === '↔' && r.nach === fVon.value && r.von === fNach.value);
      if (!route) clearRoute();
    }
  });

  // ---------- Schritt 3: Datum, Personen ----------
  const dayChips = [...form.querySelectorAll('.bk-chip[data-day]')];
  dayChips.forEach(chip => chip.addEventListener('click', () => {
    const d = new Date();
    d.setDate(d.getDate() + Number(chip.dataset.day));
    fDatum.value = isoDate(d);
    setError('Datum', '');
    syncDayChips();
  }));
  function syncDayChips() {
    dayChips.forEach(chip => {
      const d = new Date(); d.setDate(d.getDate() + Number(chip.dataset.day));
      chip.setAttribute('aria-pressed', String(fDatum.value === isoDate(d)));
    });
  }
  fDatum.addEventListener('input', () => { setError('Datum', ''); syncDayChips(); });
  fZeit.addEventListener('input', () => setError('Uhrzeit', ''));

  form.querySelectorAll('[data-step-by]').forEach(btn => btn.addEventListener('click', () => {
    const v = Math.min(8, Math.max(1, (Number(fPersonen.value) || 1) + Number(btn.dataset.stepBy)));
    fPersonen.value = v;
  }));
  fPersonen.addEventListener('change', () => {
    fPersonen.value = Math.min(8, Math.max(1, Math.round(Number(fPersonen.value) || 1)));
  });

  ['f-name', 'f-tel', 'f-mail'].forEach(id => $(id).addEventListener('input', (e) => setError(e.target.name, '')));

  // ---------- Schritt 5: Übersicht ----------
  function esc(t) {
    return String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  function renderSummary() {
    const extras = [];
    const p = Number(fPersonen.value) || 1;
    extras.push(p === 1 ? '1 Person' : `${p} Personen`);
    if (form.querySelector('input[name="Rollstuhl"]').checked) extras.push('mit Rollstuhl');
    const flug = $('f-flug').value.trim();
    if (flug && artValue() === 'Flughafentransfer') extras.push(`Flug ${flug}`);

    const contact = [$('f-name').value.trim(), $('f-tel').value.trim(), $('f-mail').value.trim()].filter(Boolean);
    const notiz = $('f-notiz').value.trim();

    const rows = [
      ['Fahrt', artValue() + (fRoute.value ? ` · Festpreis ${fRoute.value.match(/\((.*)\)/)?.[1] || ''}` : ''), 1],
      ['Strecke', `${fVon.value.trim()} → ${fNach.value.trim()}`, 2],
      ['Termin', `${formatDate(fDatum.value)}, ${fZeit.value} Uhr<br>${extras.join(' · ')}`, 3],
      ['Kontakt', contact.map(esc).join('<br>') + (notiz ? `<br><span style="color:var(--muted)">${esc(notiz)}</span>` : ''), 4],
    ];

    $('bk-summary').innerHTML = '<dl>' + rows.map(([label, value, step]) => `
      <div class="bk-sum-row">
        <dt>${label}</dt>
        <dd>${step === 3 || step === 4 ? value : esc(value)}</dd>
        <button type="button" class="bk-sum-edit" data-edit="${step}">Ändern</button>
      </div>`).join('') + '</dl>';

    $('bk-summary').querySelectorAll('[data-edit]').forEach(b =>
      b.addEventListener('click', () => show(Number(b.dataset.edit), -1)));
  }

  // ---------- Absenden ----------
  async function submit() {
    const sendError = $('bk-send-error');
    sendError.textContent = '';
    nextBtn.disabled = true;
    backBtn.disabled = true;
    nextBtn.textContent = 'Wird gesendet …';

    const data = new FormData(form);
    if (!data.get('Rollstuhl')) data.set('Rollstuhl', 'Nein');
    if (artValue() !== 'Flughafentransfer') data.delete('Flugnummer');
    if (data.get('Datum')) data.set('Datum', formatDate(data.get('Datum')));

    try {
      const res = await fetch(form.action, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('Versand fehlgeschlagen');

      steps.forEach(s => { s.hidden = true; });
      doneStep.hidden = false;
      nav.hidden = true;
      counter.textContent = 'Anfrage gesendet';
      bar.style.width = '100%';
      asideItems.forEach(li => { li.classList.remove('is-current'); li.classList.add('is-done'); });
    } catch (err) {
      sendError.innerHTML = 'Das hat leider nicht geklappt. Bitte versuchen Sie es erneut oder rufen Sie uns an: <a href="tel:+491774913221">+49 177 49 13 221</a>.';
      nextBtn.disabled = false;
      backBtn.disabled = false;
      nextBtn.textContent = 'Anfrage senden';
    }
  }

  // ---------- Vorbefüllung über die Adresse (?art=… oder ?route=…) ----------
  const params = new URLSearchParams(location.search);
  let start = 1;

  const art = params.get('art');
  if (art) {
    const radio = [...form.querySelectorAll('input[name="Art der Fahrt"]')].find(r => r.value === art);
    if (radio) { radio.checked = true; start = 2; }
  }

  const routeId = params.get('route');
  if (routeId && ROUTES.some(r => r.id === routeId)) {
    form.querySelector('input[name="Art der Fahrt"][value="Feste Strecke"]').checked = true;
    applyRoute(routeId);
    start = 3;
  }

  maxReached = start;
  show(start, 1);
})();
