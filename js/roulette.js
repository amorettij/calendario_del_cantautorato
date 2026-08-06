/* ============================================================
   roulette.js — animazione slot-machine per la data corrente
   ============================================================ */

const SLOT_H = 80; // altezza in px di ogni item (deve corrispondere a --slot-h in CSS)

class RouletteAnimation {
  /**
   * @param {{ onComplete?: () => void, duration?: number }} options
   */
  constructor(options = {}) {
    this._onComplete = options.onComplete || (() => {});
    this._duration   = options.duration  || 2600;

    this._monthNames = [
      'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
      'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'
    ];
  }

  /** Avvia la sequenza completa. */
  init() {
    const now   = new Date();
    const day   = now.getDate();
    const month = now.getMonth();   // 0-based
    const year  = now.getFullYear();

    this._fill('track-day',   this._dayItems(day));
    this._fill('track-month', this._monthItems(month));
    this._fill('track-year',  this._yearItems(year));

    // Piccolo ritardo per lasciar rendere il DOM
    setTimeout(() => this._runAll(), 350);
  }

  /* ---- generatori delle sequenze ---- */

  _dayItems(target) {
    const all = Array.from({ length: 31 }, (_, i) =>
      String(i + 1).padStart(2, '0')
    );
    // Scorre 2 volte l'intero mese, poi si ferma sul giorno giusto
    return [...all, ...all, ...all.slice(0, target)];
  }

  _monthItems(target) {
    const m = this._monthNames;
    // Scorre 2 volte tutti i mesi, poi si ferma sul mese giusto
    return [...m, ...m, ...m.slice(0, target + 1)];
  }

  _yearItems(target) {
    const items = [];
    for (let y = target - 4; y <= target; y++) items.push(String(y));
    return items;
  }

  /* ---- costruzione del DOM della traccia ---- */

  _fill(trackId, items) {
    const track = document.getElementById(trackId);
    if (!track) return;
    track.innerHTML = '';
    items.forEach(text => {
      const el = document.createElement('div');
      el.className = 'slot-item';
      el.textContent = text;
      track.appendChild(el);
    });
    // Punto di partenza: mostra il primo item
    track.style.transform = 'translateY(0px)';
  }

  /* ---- lancio animazioni ---- */

  _runAll() {
    const d = this._duration;

    this._animSlot('track-day',   0,   d,        null);
    this._animSlot('track-month', 160, d * 1.05, null);
    this._animSlot('track-year',  320, d * 1.1,  () => {
      // Completato l'ultimo slot → notifica il chiamante
      setTimeout(this._onComplete, 450);
    });
  }

  /**
   * Anima una traccia da translateY(0) fino all'ultimo elemento.
   * Usa un'easing easeOutExpo per l'effetto slot-machine.
   */
  _animSlot(trackId, delay, duration, onDone) {
    setTimeout(() => {
      const track = document.getElementById(trackId);
      if (!track) { if (onDone) onDone(); return; }

      const n = track.children.length;
      if (n <= 1) { if (onDone) onDone(); return; }

      const targetY  = (n - 1) * SLOT_H;
      const start    = performance.now();

      const step = (now) => {
        const t       = Math.min((now - start) / duration, 1);
        const eased   = RouletteAnimation._easeOutExpo(t);
        const current = eased * targetY;

        track.style.transform = `translateY(-${current}px)`;

        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          track.style.transform = `translateY(-${targetY}px)`;
          if (onDone) onDone();
        }
      };

      requestAnimationFrame(step);
    }, delay);
  }

  /* f(0)=0, f(1)=1, parte molto veloce e rallenta esponenzialmente */
  static _easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }
}
