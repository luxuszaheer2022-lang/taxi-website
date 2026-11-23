// ===== 0a. Beim Neuladen immer ganz oben starten =====
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);
window.addEventListener('pageshow', () => {
  window.scrollTo(0, 0);
});


// ===== 1. Header: über dem Hero transparent, danach weiß =====
const siteHeader = document.querySelector('.site-header');
const hero = document.querySelector('.hero');

function updateOnScroll() {
  const scrollY = window.scrollY;
  siteHeader.classList.toggle('is-solid', scrollY > hero.offsetHeight - 90);
}

window.addEventListener('scroll', updateOnScroll, { passive: true });
window.addEventListener('resize', updateOnScroll);
updateOnScroll();


// ===== 1b. Navigation: gleitende Hover-Pille + aktiver Abschnitt =====
const navLinksWrap = document.querySelector('.nav-links');
const navIndicator = document.querySelector('.nav-indicator');
const navItems = [...document.querySelectorAll('.nav-links > a, .nav-trigger')];

function moveIndicator(item) {
  navIndicator.style.width = `${item.offsetWidth}px`;
  navIndicator.style.transform = `translateX(${item.offsetLeft}px)`;
  navIndicator.style.opacity = '1';
}

navItems.forEach(item => {
  item.addEventListener('mouseenter', () => {
    // Beim ersten Hover ohne Gleiten an die richtige Stelle setzen
    if (navIndicator.style.opacity !== '1') {
      navIndicator.style.transition = 'none';
      moveIndicator(item);
      navIndicator.offsetWidth; // Reflow
      navIndicator.style.transition = '';
    }
    moveIndicator(item);
  });
});
navLinksWrap.addEventListener('mouseleave', () => {
  if (!document.querySelector('.mega.is-open')) navIndicator.style.opacity = '0';
});

function setActive(id) {
  navItems.forEach(item => item.classList.toggle('is-active', item.dataset.section === id));
}

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) setActive(entry.target === hero ? null : entry.target.id);
  });
}, { rootMargin: '-45% 0px -50% 0px' });

[hero, ...navItems.map(i => document.getElementById(i.dataset.section))]
  .filter(Boolean)
  .forEach(section => sectionObserver.observe(section));


// ===== 1c. Mega-Menü =====
const megaTriggers = [...document.querySelectorAll('.nav-trigger')];
const megaPanels = [...document.querySelectorAll('[data-mega-panel]')];
const canHover = window.matchMedia('(hover: hover)').matches;
let megaCloseTimer = null;

function openMega(trigger) {
  clearTimeout(megaCloseTimer);
  megaTriggers.forEach(t => t.setAttribute('aria-expanded', String(t === trigger)));
  megaPanels.forEach(p => p.classList.toggle('is-open', p.id === trigger.dataset.mega));
  moveIndicator(trigger);
}

function closeMega() {
  clearTimeout(megaCloseTimer);
  megaTriggers.forEach(t => t.setAttribute('aria-expanded', 'false'));
  megaPanels.forEach(p => p.classList.remove('is-open'));
  navIndicator.style.opacity = '0';
}

function scheduleClose() {
  clearTimeout(megaCloseTimer);
  megaCloseTimer = setTimeout(closeMega, 180);
}

megaTriggers.forEach(trigger => {
  trigger.addEventListener('click', () => {
    trigger.getAttribute('aria-expanded') === 'true' ? closeMega() : openMega(trigger);
  });
  if (canHover) {
    trigger.addEventListener('mouseenter', () => openMega(trigger));
    trigger.addEventListener('mouseleave', scheduleClose);
  }
});

// Normale Links in der Leiste schließen ein offenes Mega-Menü
document.querySelectorAll('.nav-links > a').forEach(link => {
  link.addEventListener('mouseenter', () => { if (canHover) closeMega(); moveIndicator(link); });
});

megaPanels.forEach(panel => {
  if (canHover) {
    panel.addEventListener('mouseenter', () => clearTimeout(megaCloseTimer));
    panel.addEventListener('mouseleave', scheduleClose);
  }
  panel.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMega));
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const openTrigger = megaTriggers.find(t => t.getAttribute('aria-expanded') === 'true');
  closeMega();
  closeMobileMenu();
  if (openTrigger) openTrigger.focus();
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.nav')) { closeMega(); closeMobileMenu(); }
});


// ===== 1d. Mobil-Menü (Burger) =====
const burger = document.querySelector('.nav-burger');
const mobileMenu = document.getElementById('mobile-menu');

function closeMobileMenu() {
  burger.setAttribute('aria-expanded', 'false');
  burger.setAttribute('aria-label', 'Menü öffnen');
  mobileMenu.classList.remove('is-open');
}

burger.addEventListener('click', () => {
  const open = burger.getAttribute('aria-expanded') !== 'true';
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
  mobileMenu.classList.toggle('is-open', open);
});

mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMobileMenu));


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