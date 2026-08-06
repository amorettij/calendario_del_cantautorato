/* ============================================================
   scroll.js — scrollytelling via IntersectionObserver
              + header sticky
   ============================================================ */

class ScrollReveal {
  /**
   * @param {{ threshold?: number, rootMargin?: string }} options
   */
  constructor(options = {}) {
    this._observer = new IntersectionObserver(
      this._onIntersect.bind(this),
      {
        threshold:  options.threshold  ?? 0.12,
        rootMargin: options.rootMargin ?? '0px 0px -60px 0px',
      }
    );
  }

  /** Osserva una NodeList o un array di elementi. */
  observe(elements) {
    elements.forEach(el => this._observer.observe(el));
  }

  _onIntersect(entries) {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      this._observer.unobserve(entry.target);
    });
  }
}

/* ---- Header: compare/sparisce a seconda della posizione ---- */

function initStickyHeader() {
  const header = document.getElementById('site-header');
  const hero   = document.getElementById('hero');
  if (!header || !hero) return;

  const obs = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        header.classList.remove('visible');
        header.setAttribute('aria-hidden', 'true');
      } else {
        header.classList.add('visible');
        header.removeAttribute('aria-hidden');
      }
    },
    { threshold: 0.1 }
  );

  obs.observe(hero);
}

/* ---- Parallax leggero sull'hero ---- */

function initHeroParallax() {
  const rings = document.querySelector('.hero-rings');
  if (!rings || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  window.addEventListener('scroll', () => {
    const y = window.scrollY * 0.25;
    rings.style.transform = `translateY(${y}px)`;
  }, { passive: true });
}
