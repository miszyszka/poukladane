/* ════════════════════════════════════════════
   POUKŁADANE — skrypt podstron tekstowych
   (podstrony nie mają menu ani paneli, więc potrzebują
   tylko obsługi cookies i roku w stopce)
   ════════════════════════════════════════════ */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const COOKIE_KEY = 'poukladane-cookies';
const cookieBar = document.getElementById('cookies');

function readConsent() {
  try { return localStorage.getItem(COOKIE_KEY); } catch (_) { return null; }
}

function saveConsent(value) {
  try { localStorage.setItem(COOKIE_KEY, value); } catch (_) { /* tryb prywatny */ }
}

function enableAnalytics() {
  // Tu wklej kod analityki — uruchomi się dopiero po zgodzie.
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

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();
