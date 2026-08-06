/* ============================================================
   timeline.js — linea del tempo dei cantautori
   ============================================================ */

(function () {
  'use strict';

  const LABEL_WIDTH = 220; // px — deve corrispondere a --tl-label-w in CSS

  /* ---- utility ---- */

  async function loadJSON(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Impossibile caricare ${path} (${res.status})`);
    return res.json();
  }

  function escHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /** "1940-06-14" → "14 giugno 1940" */
  function fmtDateLong(str) {
    if (!str) return null;
    const [y, m, d] = (str || '').split('-');
    if (!y || isNaN(parseInt(y))) return str;
    const mesi = [
      'gennaio','febbraio','marzo','aprile','maggio','giugno',
      'luglio','agosto','settembre','ottobre','novembre','dicembre'
    ];
    const mName = mesi[parseInt(m, 10) - 1];
    return mName ? `${parseInt(d, 10)} ${mName} ${y}` : str;
  }

  function getYear(dateStr) {
    if (!dateStr) return null;
    const y = parseInt(dateStr.split('-')[0], 10);
    return isNaN(y) ? null : y;
  }

  function pct(value, min, range) {
    return ((value - min) / range * 100).toFixed(3) + '%';
  }

  /* ---- rendering ---- */

  function buildAxis(ticks, min, range) {
    return ticks.map(y => {
      const left = pct(y, min, range);
      return `<span class="tl-tick" style="left:${left}">${y}</span>`;
    }).join('');
  }

  function buildRow(key, data, min, range, currentYear) {
    const birthYear = getYear(data.nascita);
    const deathYear = data.morte ? getYear(data.morte) : null;
    const endYear   = deathYear ?? currentYear;
    const alive     = !deathYear;

    const barStart = pct(birthYear, min, range);
    const barWidth = pct(endYear - birthYear, 0, range);

    const fotoSrc = data.foto ? `foto/${escHtml(data.foto)}` : null;
    const photoHtml = fotoSrc
      ? `<img class="tl-photo" src="${fotoSrc}" alt="${escHtml(data.nome)}"
              onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
         <span class="tl-photo-placeholder" style="display:none" aria-hidden="true">♪</span>`
      : `<span class="tl-photo-placeholder" aria-hidden="true">♪</span>`;

    const barClass = alive ? 'tl-bar tl-bar--alive' : 'tl-bar';
    const endDotClass = alive ? 'tl-bar-dot tl-bar-dot--alive' : 'tl-bar-dot tl-bar-dot--end';

    return `
    <div class="tl-row" data-key="${escHtml(key)}" role="button" tabindex="0"
         aria-label="Apri scheda di ${escHtml(data.nome)}">
      <div class="tl-label">
        ${photoHtml}
        <span class="tl-name">${escHtml(data.nome)}</span>
      </div>
      <div class="tl-track" data-min="${min}" data-range="${range}">
        <div class="${barClass}"
             style="--tl-start:${barStart}; --tl-width:${barWidth}">
          <span class="tl-bar-dot" aria-hidden="true"></span>
          <span class="${endDotClass}" aria-hidden="true"></span>
          <span class="tl-bar-year tl-bar-year--start" aria-hidden="true">${birthYear}</span>
          <span class="tl-bar-year tl-bar-year--end" aria-hidden="true">${endYear}</span>
        </div>
      </div>
    </div>`;
  }

  function renderTimeline(entries, cantautori) {
    const container  = document.getElementById('timeline-container');
    const loadingEl  = document.getElementById('tl-loading');
    const currentYear = new Date().getFullYear();

    if (!container) return;

    if (entries.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">♩</div>
          <p class="empty-state__desc">Nessun cantautore con dati validi trovato.</p>
        </div>`;
      return;
    }

    /* range anni */
    const allYears = entries.flatMap(([_, d]) => {
      const b = getYear(d.nascita);
      const e = d.morte ? getYear(d.morte) : currentYear;
      return [b, e].filter(Boolean);
    });
    const rawMin = Math.min(...allYears);
    const rawMax = Math.max(...allYears);
    const pad = 4;
    const min   = rawMin - pad;
    const max   = rawMax + pad;
    const range = max - min;

    /* tick decadi */
    const firstDecade = Math.ceil(min / 10) * 10;
    const ticks = [];
    for (let y = firstDecade; y <= max; y += 10) ticks.push(y);

    const axisHtml  = buildAxis(ticks, min, range);
    const rowsHtml  = entries.map(([key, data]) =>
      buildRow(key, data, min, range, currentYear)
    ).join('');

    /* linee verticali delle decadi — iniettate nei track */
    const decadeLines = ticks.map(y =>
      `<div class="tl-decade-line" style="left:${pct(y, min, range)}"></div>`
    ).join('');

    container.innerHTML = `
      <div class="tl-wrapper">
        <div class="tl-axis-row">
          <div class="tl-axis-spacer"></div>
          <div class="tl-axis">${axisHtml}</div>
        </div>

        <div id="tl-rows">${rowsHtml}</div>

        <div class="tl-axis-row tl-axis-row--bottom">
          <div class="tl-axis-spacer"></div>
          <div class="tl-axis">${axisHtml}</div>
        </div>
      </div>`;

    /* inietta le linee delle decadi in ogni track */
    container.querySelectorAll('.tl-track').forEach(track => {
      track.insertAdjacentHTML('afterbegin', decadeLines);
    });
  }

  /* ---- MODAL ---- */

  function initModal(cantautori) {
    const overlay  = document.getElementById('modal-overlay');
    const closeBtn = document.getElementById('modal-close');
    const photoArea = document.getElementById('modal-photo-area');
    const nameEl   = document.getElementById('modal-name');
    const metaEl   = document.getElementById('modal-meta');

    if (!overlay) return;

    function openModal(key) {
      const data = cantautori[key];
      if (!data) return;

      const birthYear = getYear(data.nascita);
      const deathYear = data.morte ? getYear(data.morte) : null;

      const birthDate = data.nascita ? new Date(data.nascita) : null;
      const endDate   = data.morte   ? new Date(data.morte)   : new Date();
      let age = null;
      if (birthDate) {
        age = endDate.getFullYear() - birthDate.getFullYear();
        const notYetHadBirthday =
          endDate.getMonth() < birthDate.getMonth() ||
          (endDate.getMonth() === birthDate.getMonth() &&
           endDate.getDate()  < birthDate.getDate());
        if (notYetHadBirthday) age--;
      }

      /* foto */
      if (data.foto) {
        photoArea.innerHTML = `
          <img class="modal-photo" src="foto/${escHtml(data.foto)}"
               alt="${escHtml(data.nome)}"
               onerror="this.outerHTML='<div class=\\'modal-photo-placeholder\\'>♪</div>'">`;
      } else {
        photoArea.innerHTML = `<div class="modal-photo-placeholder">♪</div>`;
      }

      /* nome */
      nameEl.textContent = data.nome || key;

      /* meta rows */
      const rows = [];

      if (data.nascita) {
        rows.push(`
          <div class="modal-meta-row">
            <span class="modal-meta-label">Nascita</span>
            <span class="modal-meta-value">${escHtml(fmtDateLong(data.nascita) || data.nascita)}</span>
          </div>`);
      }

      if (data.morte) {
        rows.push(`
          <div class="modal-meta-row">
            <span class="modal-meta-label">Morte</span>
            <span class="modal-meta-value">${escHtml(fmtDateLong(data.morte) || data.morte)}</span>
          </div>`);
      }

      if (birthYear) {
        const label = 'Età';
        rows.push(`
          <div class="modal-meta-row">
            <span class="modal-meta-label">${label}</span>
            <span class="modal-meta-value">${age} anni</span>
          </div>`);
      }

      if (!data.morte) {
        rows.push(`
          <div class="modal-meta-row">
            <span class="modal-meta-label">Stato</span>
            <span class="modal-meta-value" style="color:var(--text-2)">In vita</span>
          </div>`);
      }

      metaEl.innerHTML = rows.join('');

      overlay.classList.add('open');
      overlay.setAttribute('aria-hidden', 'false');
      closeBtn.focus();
    }

    function closeModal() {
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
    }

    /* click su una riga */
    document.addEventListener('click', e => {
      const row = e.target.closest('.tl-row');
      if (row) openModal(row.dataset.key);
    });

    /* tastiera su una riga */
    document.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        const row = e.target.closest('.tl-row');
        if (row) { e.preventDefault(); openModal(row.dataset.key); }
      }
      if (e.key === 'Escape') closeModal();
    });

    closeBtn.addEventListener('click', closeModal);

    /* click fuori dalla card */
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal();
    });
  }

  /* ---- main ---- */

  async function main() {
    try {
      const cantautori = await loadJSON('cantautori.json');

      /* filtra entrate valide (scarta template con anno non numerico) */
      const entries = Object.entries(cantautori).filter(([_, data]) => {
        const y = getYear(data.nascita);
        return y !== null && y > 1800 && data.nome;
      });

      /* ordina per anno di nascita */
      entries.sort(([, a], [, b]) => getYear(a.nascita) - getYear(b.nascita));

      renderTimeline(entries, cantautori);
      initModal(cantautori);

    } catch (err) {
      const container = document.getElementById('timeline-container');
      if (container) {
        container.innerHTML = `
          <div class="empty-state">
            <p style="color:var(--red)">Errore nel caricamento dei dati.</p>
            <p style="color:var(--text-3);font-size:.85rem">${escHtml(err.message)}</p>
          </div>`;
      }
      console.error('[timeline]', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
  } else {
    main();
  }
})();
