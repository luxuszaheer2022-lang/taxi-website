// ===== 0a. Beim Neuladen immer ganz oben starten =====
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);
window.addEventListener('pageshow', () => {
  window.scrollTo(0, 0);
});


// ===== Hilfsfunktion: Text in einzelne <span class="letter"> zerlegen =====
function splitIntoLetters(el) {
  const text = el.getAttribute('data-text');
  el.innerHTML = '';
  const spans = [];
  text.split('').forEach(char => {
    const span = document.createElement('span');
    span.classList.add('letter');
    span.textContent = char === ' ' ? '\u00A0' : char;
    el.appendChild(span);
    spans.push(span);
  });
  return spans;
}


// ===== 0. Krone: Fahnen-Wellen-Effekt (Canvas, streifenweise verschoben) =====
const crownCanvas = document.getElementById('hero-crown');
const crownCtx = crownCanvas.getContext('2d');
const crownImg = new Image();
crownImg.src = 'assets/logo-icon-crown-only.png';

let crownLoaded = false;
crownImg.onload = () => {
  crownLoaded = true;
  crownCanvas.width = crownImg.naturalWidth;
  crownCanvas.height = crownImg.naturalHeight;
};

const FLAG_STRIPS = 70;
const FLAG_MAX_AMPLITUDE = 0.09;
const FLAG_WAVE_COUNT = 2.2;
const FLAG_SPEED = 0.0035;

function drawWavingCrown(time) {
  if (crownLoaded) {
    const w = crownCanvas.width;
    const h = crownCanvas.height;
    const maxAmplitudePx = h * FLAG_MAX_AMPLITUDE;
    const stripWidth = w / FLAG_STRIPS;

    crownCtx.clearRect(0, 0, w, h);

    for (let i = 0; i < FLAG_STRIPS; i++) {
      const xRatio = i / FLAG_STRIPS;
      const amplitude = xRatio * maxAmplitudePx;

      const wave = Math.sin(xRatio * Math.PI * FLAG_WAVE_COUNT - time * FLAG_SPEED);
      const offsetY = wave * amplitude;

      const sx = i * (crownImg.naturalWidth / FLAG_STRIPS);
      const sw = crownImg.naturalWidth / FLAG_STRIPS + 1;
      const dx = i * stripWidth;

      crownCtx.drawImage(
        crownImg,
        sx, 0, sw, crownImg.naturalHeight,
        dx, offsetY, stripWidth + 1, h
      );
    }
  }
  requestAnimationFrame(drawWavingCrown);
}
requestAnimationFrame(drawWavingCrown);

const heroCrown = crownCanvas;
const crownState = { mouseX: 0, mouseY: 0, scrollX: 0, scrollY: 0, scrollScale: 1, scrollOpacity: 1, tapX: 0, tapY: 0, tapScale: 1 };

function applyCrownTransform() {
  const x = crownState.mouseX + crownState.scrollX + crownState.tapX;
  const y = crownState.mouseY + crownState.scrollY + crownState.tapY;
  heroCrown.style.transform = `translate(${x}px, ${y}px) scale(${crownState.scrollScale * crownState.tapScale})`;
  heroCrown.style.opacity = crownState.scrollOpacity;
}

// Sanfter "Luftballon"-Effekt beim Antippen: kurz aufblähen, dann weich zurück in die Ausgangsposition
function tapBounce(state, render) {
  const duration = 550;
  const start = performance.now();
  const pushX = (Math.random() - 0.5) * 26;
  const pushY = -18 - Math.random() * 12;
  const peakScale = 1.4;

  function step(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    state.tapX = pushX * (1 - ease);
    state.tapY = pushY * (1 - ease);
    state.tapScale = 1 + (peakScale - 1) * (1 - ease);
    render();

    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      state.tapX = 0;
      state.tapY = 0;
      state.tapScale = 1;
      render();
    }
  }
  requestAnimationFrame(step);
}


// ===== 1. Hero-Buchstaben aufbauen =====
document.querySelectorAll('.line').forEach(line => splitIntoLetters(line));

const letters = document.querySelectorAll('.hero-title .letter');
const hero = document.querySelector('.hero');

const letterState = [];
letters.forEach((letter) => {
  letterState.push({ el: letter, mouseX: 0, mouseY: 0, scrollX: 0, scrollY: 0, scrollScale: 1, scrollOpacity: 1, tapX: 0, tapY: 0, tapScale: 1 });
});

function applyLetterTransform(state) {
  const x = state.mouseX + state.scrollX + state.tapX;
  const y = state.mouseY + state.scrollY + state.tapY;
  state.el.style.transform = `translate(${x}px, ${y}px) scale(${state.scrollScale * state.tapScale})`;
  state.el.style.opacity = state.scrollOpacity;
}

// ===== 1a. Mobil: Ballon-Tipp-Effekt für Buchstaben und Krone =====
letterState.forEach((state) => {
  state.el.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    tapBounce(state, () => applyLetterTransform(state));
  });
});

heroCrown.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'touch') return;
  tapBounce(crownState, applyCrownTransform);
});


hero.addEventListener('mousemove', (e) => {
  letterState.forEach(state => {
    const rect = state.el.getBoundingClientRect();
    const letterX = rect.left + rect.width / 2;
    const letterY = rect.top + rect.height / 2;
    const dx = e.clientX - letterX;
    const dy = e.clientY - letterY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const radius = 150;

    if (distance < radius) {
      const strength = (radius - distance) / radius;
      state.mouseX = -dx * strength * 0.4;
      state.mouseY = -dy * strength * 0.4;
    } else {
      state.mouseX = 0;
      state.mouseY = 0;
    }
  });

  const crownRect = heroCrown.getBoundingClientRect();
  const crownX = crownRect.left + crownRect.width / 2;
  const crownY = crownRect.top + crownRect.height / 2;
  const cdx = e.clientX - crownX;
  const cdy = e.clientY - crownY;
  const crownDistance = Math.sqrt(cdx * cdx + cdy * cdy);
  const crownRadius = 120;

  if (crownDistance < crownRadius) {
    const strength = (crownRadius - crownDistance) / crownRadius;
    crownState.mouseX = -cdx * strength * 0.4;
    crownState.mouseY = -cdy * strength * 0.4;
  } else {
    crownState.mouseX = 0;
    crownState.mouseY = 0;
  }
  applyCrownTransform();
});


// ===== 2. Schmetterlinge im Hintergrund =====
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const palette = [
  { fill: '#3b7bc4', edge: '#14243f', shine: '#bfe0ff' },
  { fill: '#4a90d9', edge: '#1a2f4d', shine: '#cfe9ff' },
  { fill: '#2f6fa8', edge: '#101d33', shine: '#a9d4f5' }
];

function makeButterfly() {
  return {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 8 + 16,
    angle: Math.random() * Math.PI * 2,
    speed: Math.random() * 0.5 + 0.25,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: Math.random() * 0.02 + 0.008,
    flapPhase: Math.random() * Math.PI * 2,
    flapSpeed: Math.random() * 0.12 + 0.14,
    turnSeed: Math.random() * 1000,
    colors: palette[Math.floor(Math.random() * palette.length)],
    opacity: Math.random() * 0.3 + 0.4
  };
}

const butterflyCount = 20;
const butterflies = [];
for (let i = 0; i < butterflyCount; i++) butterflies.push(makeButterfly());

function drawWingPair(size, colors) {
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.05);
  ctx.bezierCurveTo(size * 0.15, -size * 0.65, size * 0.95, -size * 0.55, size * 0.9, -size * 0.05);
  ctx.bezierCurveTo(size * 0.8, size * 0.25, size * 0.35, size * 0.28, size * 0.02, size * 0.02);
  ctx.closePath();
  ctx.fillStyle = colors.fill;
  ctx.fill();
  ctx.lineWidth = size * 0.05;
  ctx.strokeStyle = colors.edge;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(size * 0.15, -size * 0.1);
  ctx.bezierCurveTo(size * 0.3, -size * 0.35, size * 0.6, -size * 0.32, size * 0.68, -size * 0.12);
  ctx.strokeStyle = colors.shine;
  ctx.lineWidth = size * 0.06;
  ctx.globalAlpha *= 0.6;
  ctx.stroke();
  ctx.globalAlpha /= 0.6;

  ctx.beginPath();
  ctx.moveTo(size * 0.05, size * 0.0);
  ctx.bezierCurveTo(size * 0.5, size * 0.15, size * 0.55, size * 0.55, size * 0.2, size * 0.62);
  ctx.bezierCurveTo(size * 0.02, size * 0.5, -size * 0.02, size * 0.2, size * 0.05, size * 0.0);
  ctx.closePath();
  ctx.fillStyle = colors.fill;
  ctx.fill();
  ctx.strokeStyle = colors.edge;
  ctx.lineWidth = size * 0.045;
  ctx.stroke();
}

function drawButterfly(b) {
  const flap = 0.15 + 0.85 * Math.abs(Math.sin(b.flapPhase));

  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(b.angle + Math.PI / 2);
  ctx.globalAlpha = b.opacity;

  ctx.save();
  ctx.scale(flap, 1);
  drawWingPair(b.size, b.colors);
  ctx.restore();

  ctx.save();
  ctx.scale(-flap, 1);
  drawWingPair(b.size, b.colors);
  ctx.restore();

  ctx.fillStyle = '#111318';
  ctx.beginPath();
  ctx.ellipse(0, -b.size * 0.08, b.size * 0.05, b.size * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -b.size * 0.4, b.size * 0.06, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#111318';
  ctx.lineWidth = Math.max(b.size * 0.02, 0.6);
  ctx.beginPath();
  ctx.moveTo(0, -b.size * 0.42);
  ctx.quadraticCurveTo(-b.size * 0.15, -b.size * 0.65, -b.size * 0.22, -b.size * 0.75);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -b.size * 0.42);
  ctx.quadraticCurveTo(b.size * 0.15, -b.size * 0.65, b.size * 0.22, -b.size * 0.75);
  ctx.stroke();

  ctx.restore();
}

function updateButterfly(b) {
  b.angle += Math.sin(b.turnSeed + Date.now() * 0.0006) * 0.02;
  b.x += Math.cos(b.angle) * b.speed;
  b.y += Math.sin(b.angle) * b.speed + Math.sin(b.wobble) * 0.4;
  b.wobble += b.wobbleSpeed;
  b.flapPhase += b.flapSpeed;

  const margin = 50;
  if (b.x < -margin) b.x = canvas.width + margin;
  if (b.x > canvas.width + margin) b.x = -margin;
  if (b.y < -margin) b.y = canvas.height + margin;
  if (b.y > canvas.height + margin) b.y = -margin;
}

function drawScene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  butterflies.forEach(b => {
    updateButterfly(b);
    drawButterfly(b);
  });
  requestAnimationFrame(drawScene);
}
drawScene();


// ===== 3. Scroll-Effekte im Hero =====
const progressTrack = document.querySelector('.progress-track');
const progressMarker = document.querySelector('.progress-marker');
const scrollHint = document.querySelector('.scroll-hint');
const EXPLODE_DISTANCE_FACTOR = 0.25;

function updateScrollEffects() {
  const heroHeight = hero.offsetHeight;
  const scrollY = window.scrollY;

  let heroProgress = scrollY / (heroHeight * EXPLODE_DISTANCE_FACTOR);
  heroProgress = Math.min(Math.max(heroProgress, 0), 1);

  canvas.style.opacity = 1 - heroProgress;

  if (scrollHint) {
    scrollHint.style.opacity = 1 - heroProgress * 4;
  }

  letterState.forEach((state, i) => {
    const centerOffset = i - letterState.length / 2;
    state.scrollX = centerOffset * 60 * heroProgress;
    state.scrollY = -heroProgress * 260 + (centerOffset * centerOffset) * 4 * heroProgress;
    state.scrollScale = 1 - heroProgress * 0.4;
    state.scrollOpacity = 1 - heroProgress;
    applyLetterTransform(state);
  });

  crownState.scrollY = -heroProgress * 200;
  crownState.scrollScale = 1 - heroProgress * 0.5;
  crownState.scrollOpacity = 1 - heroProgress;
  applyCrownTransform();

  const trackHeight = progressTrack.offsetHeight;
  const docScrollable = document.documentElement.scrollHeight - window.innerHeight;
  const overallProgress = docScrollable > 0 ? scrollY / docScrollable : 0;
  progressMarker.style.top = `${overallProgress * trackHeight}px`;
}

function loop() {
  updateScrollEffects();
  requestAnimationFrame(loop);
}
loop();


// ===== 4. Flotte: Karten fallen rein und fliegen beim Rausscrollen wieder raus =====
const CARD_FALL_BASE_DELAY_MS = 250;
const CARD_STAGGER_MS = 100;

const ENTER_TRANSITION = 'opacity 0.35s ease, transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)';
const EXIT_TRANSITION = 'opacity 0.3s ease-in, transform 0.4s cubic-bezier(0.4, 0, 1, 1)';

function prepareCardForEntry(el) {
  el.style.transition = ENTER_TRANSITION;
  el.style.opacity = '0';
  el.style.transform = 'translateY(-160px)';
}

function playCardExit(el) {
  el.style.transition = EXIT_TRANSITION;
  el.style.opacity = '0';
  el.style.transform = 'translateY(-90px) scale(0.97)';
  el.classList.remove('in-view');
}

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const el = entry.target;

    if (entry.isIntersecting) {
      clearTimeout(el._fallTimeout);
      prepareCardForEntry(el);
      const delay = Number(el.dataset.fallDelay || CARD_FALL_BASE_DELAY_MS);
      el._fallTimeout = setTimeout(() => {
        el.style.transition = ENTER_TRANSITION;
        el.classList.add('in-view');
        el.style.opacity = '';
        el.style.transform = '';
      }, delay);
    } else {
      clearTimeout(el._fallTimeout);
      playCardExit(el);
    }
  });
}, { threshold: 0.2 });

document.querySelectorAll('.reveal-card').forEach((card, i) => {
  card.dataset.fallDelay = CARD_FALL_BASE_DELAY_MS + i * CARD_STAGGER_MS;
  revealObserver.observe(card);
});

const underlineObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    entry.target.classList.toggle('in-view', entry.isIntersecting);
  });
}, { threshold: 0.2 });
underlineObserver.observe(document.getElementById('fleet-underline'));

const serviceObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    entry.target.classList.toggle('in-view', entry.isIntersecting);
  });
}, { threshold: 0.2 });
document.querySelectorAll('.service-card').forEach(card => serviceObserver.observe(card));
// ===== 5. Detail-Sektion: Seite/Heck crossfaden beim Scrollen =====
const detailSection = document.getElementById('detail');
const detailRearImg = document.querySelector('.detail-img-rear');

if (detailSection && detailRearImg) {
  const detailObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      detailRearImg.classList.toggle('visible', entry.isIntersecting);
    });
  }, { threshold: 0.5 });
  detailObserver.observe(detailSection);
}


// ===== 5b. Leistungen & Feste Fahrten: Klick befüllt das Buchungsformular =====
const bookingVonInput = document.getElementById('booking-von');
const bookingNachInput = document.getElementById('booking-nach');
const bookingRideInput = document.getElementById('booking-ride');

document.querySelectorAll('.service-card[data-service]').forEach(card => {
  card.addEventListener('click', () => {
    if (bookingRideInput) bookingRideInput.value = card.dataset.service;
    if (bookingVonInput) bookingVonInput.value = '';
    if (bookingNachInput) bookingNachInput.value = '';
  });
});

document.querySelectorAll('.route-btn[data-von]').forEach(btn => {
  btn.addEventListener('click', () => {
    if (bookingVonInput) bookingVonInput.value = btn.dataset.von;
    if (bookingNachInput) bookingNachInput.value = btn.dataset.nach;
    if (bookingRideInput) {
      bookingRideInput.value = `Feste Fahrt ${btn.dataset.von} → ${btn.dataset.nach} (${btn.dataset.price})`;
    }
  });
});


// ===== 6. Fahrt buchen: Formular per Formspree versenden =====
const bookingForm = document.getElementById('booking-form');
const bookingStatus = document.getElementById('booking-status');

if (bookingForm) {
  bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    bookingStatus.textContent = 'Anfrage wird gesendet …';
    bookingStatus.className = 'booking-status';

    try {
      const response = await fetch(bookingForm.action, {
        method: 'POST',
        body: new FormData(bookingForm),
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        bookingStatus.textContent = 'Danke! Deine Anfrage wurde gesendet — wir melden uns schnellstmöglich.';
        bookingStatus.className = 'booking-status success';
        bookingForm.reset();
      } else {
        throw new Error('Versand fehlgeschlagen');
      }
    } catch (err) {
      bookingStatus.textContent = 'Leider ist etwas schiefgelaufen. Bitte ruf uns direkt an: +49 177 49 13 221.';
      bookingStatus.className = 'booking-status error';
    }
  });
}


// ===== 6b. Über uns: Zahlen hochzählen beim Reinscrollen =====
const statNumbers = document.querySelectorAll('.stat-number');

function animateStat(el) {
  const target = Number(el.dataset.target);
  const suffix = el.dataset.suffix || '';
  const plain = el.dataset.plain === 'true';
  const duration = 1600;
  const startTime = performance.now();

  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(target * eased);
    el.textContent = (plain ? current : current.toLocaleString('de-DE')) + (progress === 1 ? suffix : '');

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }
  requestAnimationFrame(step);
}

const aboutStats = document.querySelector('.about-stats');

if (aboutStats && statNumbers.length) {
  const statObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        statNumbers.forEach(animateStat);
        statObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -10% 0px' });

  statObserver.observe(aboutStats);
}


// ===== 7. Footer: aktuelles Jahr =====
const footerYear = document.getElementById('footer-year');
if (footerYear) {
  footerYear.textContent = new Date().getFullYear();
}