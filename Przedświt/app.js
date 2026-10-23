const sectionTwo = document.querySelector('.section-two');
const sectionTwoContent = document.querySelector('.section-two-content');
const hamburgerBtn = document.querySelector('.hamburger-btn');

let scrollProgress = 0.5;
let minProgress = 0.5;
let isFullscreen = false;

function isMobile() {
    return window.innerWidth <= 768;
}

// Maps [0.5, 1] → [translateX(50vw), translateX(50px)]
function applyTransform(progress) {
    if (isMobile()) return;
    const t = (progress - 0.5) * 2;
    const vw = 50 * (1 - t);
    const px = 50 * t;
    sectionTwo.style.transform = `translateX(calc(${vw}vw + ${px}px))`;
}

function getTotalDistance() {
    return window.innerWidth - 100;
}

function normalizeDelta(e) {
    let delta = e.deltaY;
    if (e.deltaMode === 1) delta *= 16;
    if (e.deltaMode === 2) delta *= window.innerHeight;
    return delta;
}

document.addEventListener('wheel', (e) => {
    if (isFullscreen || isMobile()) return;

    e.preventDefault();

    const delta = normalizeDelta(e);

    if (scrollProgress >= 1) {
        const panelScroll = document.querySelector('.panel.active .panel-scroll');
        if (delta < 0 && (!panelScroll || panelScroll.scrollTop === 0)) {
            scrollProgress = Math.min(Math.max(scrollProgress + delta / getTotalDistance(), minProgress), 1);
            applyTransform(scrollProgress);
        } else if (panelScroll) {
            panelScroll.scrollTop += delta;
        }
        return;
    }

    scrollProgress = Math.min(Math.max(scrollProgress + delta / getTotalDistance(), minProgress), 1);
    applyTransform(scrollProgress);
}, { passive: false });

function animateToEdge() {
    if (isMobile()) return;
    const start = scrollProgress;
    const duration = 700;
    const startTime = performance.now();

    function step(now) {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        scrollProgress = start + (1 - start) * eased;
        applyTransform(scrollProgress);
        if (t < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
}

// Default active panel
document.querySelector('.panel[data-content="about"]').classList.add('active');
document.querySelector('.menu-item[data-section="about"]').classList.add('active');

// Menu clicks
document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();

        const target = item.dataset.section;

        document.querySelectorAll('.panel').forEach(panel => {
            panel.classList.toggle('active', panel.dataset.content === target);
        });
        document.querySelectorAll('.menu-item').forEach(mi => {
            mi.classList.toggle('active', mi === item);
        });

        if (isMobile()) {
            sectionTwoContent.classList.remove('is-open');
            hamburgerBtn.classList.remove('is-open');
        } else {
            animateToEdge();
        }
    });
});

// Hamburger toggle
hamburgerBtn.addEventListener('click', () => {
    const isOpen = sectionTwoContent.classList.toggle('is-open');
    hamburgerBtn.classList.toggle('is-open', isOpen);
});
