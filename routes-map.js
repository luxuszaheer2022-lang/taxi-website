// ===== Feste Fahrten: interaktive Strecken-Karte =====
(function () {
  const mapEl = document.getElementById('routes-map');
  if (!mapEl || !window.L || !window.LT_ROUTES) return;

  const ROUTES = window.LT_ROUTES;
  const PLACES = window.LT_PLACES;
  const card = document.getElementById('route-card');
  const listItems = [...document.querySelectorAll('.route-item[data-route]')];
  const isTouch = window.matchMedia('(hover: none)').matches;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const GOLD = '#c9a54a';
  const INK = '#15161a';
  const IDLE = '#8f8a7e';

  // --- Karte ---
  const map = L.map(mapEl, {
    scrollWheelZoom: false,          // Seite scrollt normal weiter
    dragging: !isTouch,              // auf dem Handy nicht mit einem Finger "festhängen"
    tap: false,
    zoomControl: true,
    attributionControl: true,
  });

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  map.zoomControl.setPosition('topright');

  // Scrollrad-Zoom erst nach Klick in die Karte, beim Verlassen wieder aus
  map.on('click', () => map.scrollWheelZoom.enable());
  mapEl.addEventListener('mouseleave', () => map.scrollWheelZoom.disable());

  const allBounds = L.latLngBounds(Object.values(PLACES));

  function cardPadding() {
    // Platz für die Info-Karte unten links freihalten
    const wide = mapEl.offsetWidth > 640;
    return wide
      ? { paddingTopLeft: [60, 50], paddingBottomRight: [50, 50] }
      : { paddingTopLeft: [30, 30], paddingBottomRight: [30, card.offsetHeight + 30] };
  }

  map.fitBounds(allBounds, cardPadding());

  // --- Ortsmarken ---
  const markers = {};
  Object.entries(PLACES).forEach(([name, latlng]) => {
    const icon = L.divIcon({
      className: '',
      html: `<div class="city-marker"><span class="city-dot"></span><span class="city-label">${name}</span></div>`,
      iconSize: null,
      iconAnchor: [7, 7],
    });
    markers[name] = L.marker(latlng, { icon, keyboard: false, interactive: false }).addTo(map);
  });

  function markerEl(name) {
    const el = markers[name].getElement();
    return el && el.querySelector('.city-marker');
  }

  // --- Linien ---
  const layers = {};
  ROUTES.forEach(route => {
    const casing = L.polyline(route.path, { color: '#ffffff', weight: 7, opacity: 0.9, interactive: false });
    const line = L.polyline(route.path, {
      color: IDLE, weight: 3, opacity: 0.8, className: 'route-line', lineCap: 'round', lineJoin: 'round',
    });
    // breite, unsichtbare Klickfläche
    const hit = L.polyline(route.path, { color: '#000', weight: 18, opacity: 0 });

    casing.addTo(map);
    line.addTo(map);
    hit.addTo(map);

    hit.on('click', () => selectRoute(route.id));
    hit.on('mouseover', () => previewRoute(route.id, true));
    hit.on('mouseout', () => previewRoute(route.id, false));
    hit.bindTooltip(`${route.von} ${route.arrow} ${route.nach}`, { sticky: true, direction: 'top', opacity: 0.95 });

    layers[route.id] = { casing, line, hit, route };
  });

  let selectedId = null;

  function styleAll() {
    Object.values(layers).forEach(({ casing, line, route }) => {
      const active = route.id === selectedId;
      const dim = selectedId && !active;
      line.setStyle({ color: active ? GOLD : IDLE, weight: active ? 5 : 3, opacity: dim ? 0.3 : 0.85 });
      casing.setStyle({ color: active ? INK : '#ffffff', weight: active ? 9 : 7, opacity: dim ? 0.4 : 0.9 });
    });

    const sel = selectedId && layers[selectedId].route;
    Object.keys(markers).forEach(name => {
      const el = markerEl(name);
      if (!el) return;
      const on = sel && (sel.von === name || sel.nach === name);
      el.classList.toggle('is-active', !!on);
      el.classList.toggle('is-dim', !!sel && !on);
    });
  }

  function previewRoute(id, on) {
    if (id === selectedId) return;
    const { line } = layers[id];
    line.setStyle(on ? { color: INK, opacity: 1 } : { color: IDLE, opacity: selectedId ? 0.3 : 0.85 });
    listItems.forEach(li => li.classList.toggle('is-hover', on && li.dataset.route === id));
  }

  function drawIn(polyline) {
    const path = polyline.getElement();
    if (!path || reduceMotion) return;
    const len = path.getTotalLength();
    path.style.transition = 'none';
    path.style.strokeDasharray = `${len}`;
    path.style.strokeDashoffset = `${len}`;
    path.getBoundingClientRect(); // Reflow
    path.style.transition = 'stroke-dashoffset 1.1s cubic-bezier(0.65, 0, 0.35, 1)';
    path.style.strokeDashoffset = '0';
    setTimeout(() => {
      path.style.strokeDasharray = '';
      path.style.strokeDashoffset = '';
      path.style.transition = '';
    }, 1200);
  }

  function formatDuration(min) {
    if (min < 60) return `ca. ${min} Min.`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `ca. ${h} Std. ${m} Min.` : `ca. ${h} Std.`;
  }

  function renderCard(route) {
    card.innerHTML = `
      <p class="route-card-title">${route.von} <span class="route-arrow">${route.arrow}</span> ${route.nach}</p>
      <p class="route-card-meta"><span>${route.km} km</span><span>${formatDuration(route.min)}</span></p>
      <div class="route-card-foot">
        <span class="route-card-price">${route.price}</span>
        <a href="buchen.html?route=${route.id}" class="btn btn-primary route-card-book">Diese Fahrt buchen</a>
      </div>
      <p class="route-card-note">Fahrzeit ohne Verkehr gerechnet.</p>`;
    card.classList.remove('is-updating');
    void card.offsetWidth;
    card.classList.add('is-updating');

  }

  function selectRoute(id) {
    const entry = layers[id];
    if (!entry) return;
    selectedId = id;

    listItems.forEach(li => li.setAttribute('aria-pressed', String(li.dataset.route === id)));
    if (select && select.value !== id) select.value = id;
    styleAll();
    entry.casing.bringToFront();
    entry.line.bringToFront();
    Object.values(layers).forEach(l => l.hit.bringToFront());

    renderCard(entry.route);

    const opts = cardPadding();
    if (reduceMotion) map.fitBounds(entry.line.getBounds(), opts);
    else map.flyToBounds(entry.line.getBounds(), { ...opts, duration: 0.8 });

    map.once('moveend', () => drawIn(entry.line));
    if (reduceMotion) drawIn(entry.line);
  }

  // --- Dropdown (Handy/Tablet) ---
  const select = document.getElementById('routes-select');
  if (select) {
    const groups = [
      ['Abfahrt in Bruchsal', r => r.von === 'Bruchsal' && r.arrow !== '↔'],
      ['Abfahrt in Karlsruhe', r => r.von === 'Karlsruhe' && r.arrow !== '↔'],
      ['Zwischen Karlsruhe und Bruchsal', r => r.arrow === '↔'],
    ];
    groups.forEach(([label, test]) => {
      const og = document.createElement('optgroup');
      og.label = label;
      ROUTES.filter(test).forEach(r => {
        const o = document.createElement('option');
        o.value = r.id;
        o.textContent = `${r.von} ${r.arrow} ${r.nach} · ${r.price}`;
        og.appendChild(o);
      });
      select.appendChild(og);
    });
    select.addEventListener('change', () => {
      if (select.value) selectRoute(select.value);
      else resetView();
    });
  }

  function resetView() {
    selectedId = null;
    listItems.forEach(li => li.setAttribute('aria-pressed', 'false'));
    styleAll();
    card.innerHTML = '<p class="route-card-hint">Wählen Sie eine Strecke, um sie auf der Karte zu sehen.</p>';
    map.flyToBounds(allBounds, { ...cardPadding(), duration: reduceMotion ? 0 : 0.8 });
  }

  // --- Liste neben der Karte ---
  listItems.forEach(li => {
    li.addEventListener('click', () => selectRoute(li.dataset.route));
    if (!isTouch) {
      li.addEventListener('mouseenter', () => previewRoute(li.dataset.route, true));
      li.addEventListener('mouseleave', () => previewRoute(li.dataset.route, false));
    }
  });

  // --- Links aus Mega-Menü / Mobil-Menü: hinscrollen, dann Strecke zeigen ---
  const section = document.getElementById('feste-fahrten');
  document.querySelectorAll('a[data-route]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const id = link.dataset.route;
      section.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(null, '', '#feste-fahrten');
      // warten, bis die Karte im Bild ist, damit man die Animation sieht
      const obs = new IntersectionObserver(([entry]) => {
        if (entry.intersectionRatio > 0.6) {
          obs.disconnect();
          setTimeout(() => selectRoute(id), 150);
        }
      }, { threshold: [0.6] });
      obs.observe(mapEl);
    });
  });

  window.addEventListener('resize', () => map.invalidateSize());
})();
