/* ════════════════════════════════════════════
   POUKŁADANE — skrypt
   ════════════════════════════════════════════ */

const SECTIONS = ['osrodek', 'specjalisci', 'cennik', 'kontakt'];

// czy system prosi o ograniczenie animacji — sprawdzamy raz, na starcie
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ────────────────────────────────────────────
   1. MENU — mechanika 1:1 z oryginału, tylko poziomo
   ──────────────────────────────────────────── */
const dots   = [...document.querySelectorAll('.nav__dot')];
const labels = [...document.querySelectorAll('.nav__label')];
const ball   = document.querySelector('.nav__ball');
const panels = SECTIONS.map(name => document.getElementById('panel-' + name));

let current = 0;

function pitch() {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pitch'));
}

/* ────────────────────────────────────────────
   2. STRONY — stara wyjeżdża za krawędź, nowa wjeżdża zza przeciwnej
   ──────────────────────────────────────────── */
let leaveTimer;

// czas przejazdu odczytujemy z CSS, żeby nie rozjechał się z --travel
function travelMs() {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--travel');
  const ms = parseFloat(value);
  return value.includes('ms') ? ms : ms * 1000;
}

function swapPanel(index, animate) {
  const next = panels[index];
  const prev = panels[current];

  clearTimeout(leaveTimer);

  panels.forEach(p => p.classList.remove(
    'is-leaving', 'enter-left', 'enter-right', 'leave-left', 'leave-right'
  ));

  // bez animacji (także przy prefers-reduced-motion) po prostu podmieniamy panel:
  // animationend by nie wystąpił, a stary panel zostałby na ekranie
  if (!animate || reduceMotion || next === prev) {
    panels.forEach((p, i) => { p.hidden = i !== index; });
    return;
  }

  const forward = index > current;   // menu w prawo → nowa wchodzi z prawej

  panels.forEach(p => { if (p !== prev && p !== next) p.hidden = true; });

  // sprzątanie po animacji — wywoła je pierwsze z dwóch: animationend albo timeout.
  // Timeout jest zabezpieczeniem na wypadek, gdyby zdarzenie nie doszło
  // (przerwana animacja, karta w tle, wyłączone animacje w systemie).
  const finish = () => {
    clearTimeout(leaveTimer);
    prev.removeEventListener('animationend', onEnd);
    prev.classList.remove('is-leaving', 'leave-left', 'leave-right');
    if (prev !== panels[current]) prev.hidden = true;
  };

  function onEnd(e) {
    if (e.target !== prev) return;   // ignorujemy animacje elementów wewnątrz panelu
    finish();
  }

  prev.classList.add('is-leaving', forward ? 'leave-left' : 'leave-right');
  prev.addEventListener('animationend', onEnd);
  leaveTimer = setTimeout(finish, travelMs() + 150);

  next.hidden = false;
  next.classList.add(forward ? 'enter-right' : 'enter-left');
}

/* ────────────────────────────────────────────
   3. PRZEŁĄCZANIE
   ──────────────────────────────────────────── */
function select(index, animate = true) {
  const key = SECTIONS[index];

  dots[index].checked = true;

  // kolory przełączają się od razu i płyną przez 800 ms — tak jak w oryginale
  dots.forEach((d, i)   => d.classList.toggle('is-active', i === index));
  labels.forEach((l, i) => l.classList.toggle('is-active', i === index));

  ball.style.transform = `translateX(${index * pitch()}px)`;

  swapPanel(index, animate);

  current = index;
  document.dispatchEvent(new Event('panelchange'));

  try { history.replaceState(null, '', '#' + key); } catch (_) { /* file:// */ }
}

dots.forEach((dot, index) => {
  dot.addEventListener('change', () => select(index));
});

// strzałki przełączają zakładki
document.querySelector('.nav__track').addEventListener('keydown', (e) => {
  const step = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
  if (!step) return;
  e.preventDefault();
  const next = (current + step + SECTIONS.length) % SECTIONS.length;
  dots[next].focus();
  select(next);
});

/* ────────────────────────────────────────────
   4. ZDJĘCIA — łagodne wejście przy przewijaniu
   ──────────────────────────────────────────── */
if (!reduceMotion && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -10% 0px' });

  const watch = () => document.querySelectorAll('.reveal:not(.is-visible)').forEach(el => io.observe(el));
  watch();
  document.addEventListener('panelchange', watch);
} else {
  document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible'));
}

/* ────────────────────────────────────────────
   5. LINKI W STOPCE I W TREŚCI — przełączają panel zamiast skakać kotwicą
   ──────────────────────────────────────────── */
document.addEventListener('click', (e) => {
  const link = e.target.closest('[data-goto]');
  if (!link) return;
  const index = SECTIONS.indexOf(link.dataset.goto);
  if (index < 0) return;
  e.preventDefault();
  select(index);
  window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
});

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();


/* ────────────────────────────────────────────
   POWRÓT NA GÓRĘ

   Przycisk pojawia się po przewinięciu jednego ekranu.
   Nasłuch jest dławiony przez requestAnimationFrame, żeby
   przy szybkim scrollowaniu na telefonie nie liczyć pozycji
   przy każdym pikselu.
   ──────────────────────────────────────────── */
const toTop = document.querySelector('[data-to-top]');

/* Jeden nasłuch scrolla obsługuje dwie rzeczy: stan przyklejonej belki
   i przycisk powrotu na górę. Dławimy go przez requestAnimationFrame,
   żeby przy szybkim przewijaniu na telefonie nie liczyć pozycji co piksel. */
let scrollTicking = false;

function onScrollFrame() {
  const y = window.scrollY;

  // belka jest sticky w CSS — klasa służy tylko do cienia
  // i do schowania logo na telefonie
  document.body.classList.toggle('is-stuck', y > 40);

  if (toTop) {
    // przycisk pokazuje się dopiero przy samym dole strony
    const docHeight = document.documentElement.scrollHeight;
    const atBottom = y + window.innerHeight >= docHeight - 240;
    toTop.classList.toggle('is-visible', atBottom);
  }

  scrollTicking = false;
}

window.addEventListener('scroll', () => {
  if (scrollTicking) return;
  scrollTicking = true;
  requestAnimationFrame(onScrollFrame);
}, { passive: true });

window.addEventListener('resize', () => {
  // rozstaw kropek jest inny na wąskich ekranach, więc po zmianie
  // szerokości okna wskaźnik trzeba przeliczyć od nowa
  ball.style.transform = `translateX(${current * pitch()}px)`;

  if (scrollTicking) return;
  scrollTicking = true;
  requestAnimationFrame(onScrollFrame);
}, { passive: true });

if (toTop) {
  toTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });
}

onScrollFrame();

/* ────────────────────────────────────────────
   6. COOKIES

   Zgoda zapisuje się w localStorage pod kluczem 'poukladane-cookies'
   ('accept' albo 'reject'). Baner pokazuje się tylko wtedy, gdy nie ma
   jeszcze zapisanej decyzji. Przycisk w stopce pozwala ją zmienić.

   Skrypty analityczne (np. Google Analytics) należy uruchamiać wyłącznie
   w funkcji enableAnalytics() poniżej — inaczej zgoda jest tylko dekoracją.
   ──────────────────────────────────────────── */
const COOKIE_KEY = 'poukladane-cookies';
const cookieBar = document.getElementById('cookies');

function readConsent() {
  try { return localStorage.getItem(COOKIE_KEY); } catch (_) { return null; }
}

function saveConsent(value) {
  try { localStorage.setItem(COOKIE_KEY, value); } catch (_) { /* tryb prywatny */ }
}

function enableAnalytics() {
  // Tu wklej kod analityki, jeśli będzie potrzebna.
  // Uruchomi się dopiero po kliknięciu „Akceptuję wszystkie".
}

function showCookieBar() {
  if (!cookieBar) return;
  cookieBar.hidden = false;
  document.body.classList.add('cookies-open');
}

function hideCookieBar() {
  if (!cookieBar) return;
  cookieBar.hidden = true;
  document.body.classList.remove('cookies-open');
}

if (cookieBar) {
  const consent = readConsent();
  if (!consent) showCookieBar();
  else if (consent === 'accept') enableAnalytics();

  cookieBar.addEventListener('click', (e) => {
    const choice = e.target.closest('[data-cookie]');
    if (!choice) return;
    const value = choice.dataset.cookie;
    saveConsent(value);
    if (value === 'accept') enableAnalytics();
    hideCookieBar();
  });
}

document.addEventListener('click', (e) => {
  if (e.target.closest('[data-cookie-reopen]')) showCookieBar();
});

/* ────────────────────────────────────────────
   7. START
   ──────────────────────────────────────────── */
const fromHash = SECTIONS.indexOf(location.hash.replace('#', ''));
select(fromHash > -1 ? fromHash : 0, false);

/* ────────────────────────────────────────────
   8. EKRAN POWITALNY
   Kropki ze znaku firmowego chodzą przez ~3 s, potem ekran znika.
   Można go pominąć kliknięciem albo dowolnym klawiszem.
   ──────────────────────────────────────────── */
(() => {
  const loader = document.getElementById('loader');
  const html   = document.documentElement;

  const release = () => html.classList.remove('is-loading');

  if (!loader) { release(); return; }

  // przy ograniczonych animacjach pokazujemy znak tylko na moment
  const HOLD = reduceMotion ? 600 : 3000;
  const started = Date.now();
  let closed = false;

  const hide = () => {
    if (closed) return;
    closed = true;
    loader.classList.add('is-done');
    release();
    setTimeout(() => loader.remove(), 800);
  };

  const finish = () => setTimeout(hide, Math.max(0, HOLD - (Date.now() - started)));

  if (document.readyState === 'complete') finish();
  else window.addEventListener('load', finish, { once: true });

  // bezpiecznik: cokolwiek się stanie, po 6 s strona jest dostępna
  setTimeout(hide, 6000);

  loader.addEventListener('click', hide);
  window.addEventListener('keydown', hide, { once: true });
})();

/* ────────────────────────────────────────────
   9. ZESPÓŁ — przycisk „więcej”
   Rozwija opis i przełącza portret na drugie ujęcie.
   Drugie zdjęcie wczytuje się dopiero przy pierwszym rozwinięciu.
   ──────────────────────────────────────────── */
document.querySelectorAll('.person__toggle').forEach((btn) => {
  const card = btn.closest('.person');
  const txt  = btn.querySelector('.person__toggle-txt');
  if (!card) return;

  btn.addEventListener('click', () => {
    const open = card.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', String(open));
    if (txt) txt.textContent = open ? 'mniej' : 'więcej';

    // dociągnięcie drugiego portretu przy pierwszym otwarciu
    const second = card.querySelector('.person__img--b[data-src]');
    if (open && second) {
      second.src = second.dataset.src;
      second.removeAttribute('data-src');
    }
  });
});
