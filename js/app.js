/* ============================================================
   app.js — orchestratore principale
   ============================================================ */

(function () {
  'use strict';

  /* ---- utility: data ---- */

  function todayKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const g = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${g}`;
  }

  function todayReadable() {
    const d = new Date();
    const mesi = [
      'gennaio','febbraio','marzo','aprile','maggio','giugno',
      'luglio','agosto','settembre','ottobre','novembre','dicembre'
    ];
    return `${d.getDate()} ${mesi[d.getMonth()]} ${d.getFullYear()}`;
  }

  /** Converte "1940-06-14" → "14 giu. 1940" (o fallback alla stringa originale). */
  function fmtDate(str) {
    if (!str) return null;
    const parts = str.split('-');
    if (parts.length !== 3) return str;
    const [y, m, g] = parts;
    const abbr = ['gen.','feb.','mar.','apr.','mag.','giu.',
                   'lug.','ago.','set.','ott.','nov.','dic.'];
    const month = abbr[parseInt(m, 10) - 1];
    return month ? `${parseInt(g, 10)} ${month} ${y}` : str;
  }

  /* ---- utility: fetch JSON ---- */

  async function loadJSON(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Impossibile caricare ${path} (${res.status})`);
    return res.json();
  }

  /* ---- HTML builders ---- */

  /** Card laterale con dati del cantautore. */
  function buildAuthorCard(autoreKey, cantautori) {
    const data = cantautori[autoreKey];

    if (!data) {
      return `<div class="author-card sr-right">
        <div class="author-photo-placeholder" aria-hidden="true">♪</div>
        <div class="author-info">
          <p class="author-name">Cantautore non trovato</p>
          <p style="color:var(--text-3);font-size:.8rem">
            Chiave: <code>${escHtml(autoreKey)}</code>
          </p>
        </div>
      </div>`;
    }

    const fotoSrc = data.foto ? `foto/${data.foto}` : null;

    const fotoHtml = fotoSrc
      ? `<img class="author-photo"
              src="${escHtml(fotoSrc)}"
              alt="Fotografia di ${escHtml(data.nome || '')}"
              loading="lazy"
              onerror="this.style.display='none';
                       this.nextElementSibling.style.display='flex';">
         <div class="author-photo-placeholder" style="display:none" aria-hidden="true">♪</div>`
      : `<div class="author-photo-placeholder" aria-hidden="true">♪</div>`;

    const nascitaHtml = data.nascita
      ? `<div class="author-date">
           <span class="author-date__label">Nascita</span>
           <span class="author-date__value">${escHtml(fmtDate(data.nascita) || data.nascita)}</span>
         </div>` : '';

    const morteHtml = data.morte
      ? `<div class="author-date">
           <span class="author-date__label">Morte</span>
           <span class="author-date__value">${escHtml(fmtDate(data.morte) || data.morte)}</span>
         </div>` : '';

    return `<div class="author-card sr-right">
      ${fotoHtml}
      <div class="author-info">
        <p class="author-name">${escHtml(data.nome || autoreKey)}</p>
        <div class="author-dates">
          ${nascitaHtml}
          ${morteHtml}
        </div>
      </div>
    </div>`;
  }

  /** Sezione completa di una canzone. */
  function buildSongSection(song, index, cantautori) {
    const ytId = extractYouTubeId(song.youtube);
    const spId = extractSpotifyId(song.spotify);

    const ytContainerId = `yt-${index}`;

    /* player YouTube */
    const ytPlayer = ytId
      ? `<div class="youtube-wrap">
           <div id="${ytContainerId}"></div>
         </div>`
      : '';

    /* widget Spotify — tema scuro, nessun autoplay */
    const spPlayer = spId
      ? `<div class="spotify-wrap">
           <iframe
             src="https://open.spotify.com/embed/track/${escHtml(spId)}?utm_source=generator&theme=0"
             allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
             loading="lazy"
             title="Spotify: ${escHtml(song.titolo || '')}">
           </iframe>
         </div>`
      : '';

    /* link testuali di riserva */
    const ytLink = song.youtube
      ? `<a href="${escHtml(song.youtube)}" target="_blank" rel="noopener noreferrer" class="song-link yt">
           ▶ YouTube
         </a>` : '';

    const spLink = song.spotify
      ? `<a href="${escHtml(song.spotify)}" target="_blank" rel="noopener noreferrer" class="song-link sp">
           ♫ Spotify
         </a>` : '';

    const linksBlock = (ytLink || spLink)
      ? `<div class="song-links stagger">${ytLink}${spLink}</div>` : '';

    const quoteBlock = song.citazione
      ? `<blockquote class="song-quote sr">
           <p>${escHtml(song.citazione)}</p>
         </blockquote>` : '';

    const commentBlock = song.commento
      ? `<p class="song-comment sr">${escHtml(song.commento)}</p>` : '';

    const playersBlock = (ytPlayer || spPlayer)
      ? `<div class="song-players sr">${ytPlayer}${spPlayer}</div>` : '';

    return `
    <section class="song-section" data-index="${index}" aria-label="Canzone ${index + 1}">
      <span class="song-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
      <div class="song-inner">

        <div class="song-main">
          <div class="song-header sr">
            <h2 class="song-title">${escHtml(song.titolo || 'Titolo sconosciuto')}</h2>
            <p class="song-author">${escHtml(song.autore || '')}</p>
          </div>
          ${quoteBlock}
          ${commentBlock}
          ${linksBlock}
          ${playersBlock}
        </div>

        <aside class="song-sidebar" aria-label="Cantautore">
          ${buildAuthorCard(song.autore_json || '', cantautori)}
        </aside>

      </div>
    </section>`;
  }

  /** Escapa caratteri HTML per prevenire XSS. */
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ---- flusso principale ---- */

  async function main() {
    const loadingEl   = document.getElementById('loading-indicator');
    const songsEl     = document.getElementById('songs-container');
    const noSongsEl   = document.getElementById('no-songs');
    const headerDate  = document.getElementById('header-date');

    if (headerDate) headerDate.textContent = todayReadable();

    /* 1. Avvia header sticky e parallax */
    initStickyHeader();
    initHeroParallax();

    /* 2. Avvia animazione roulette */
    const roulette = new RouletteAnimation({
      onComplete: () => loadData(),
    });
    roulette.init();

    /* 3. Carica i dati dopo il completamento della roulette */
    async function loadData() {
      try {
        const key = todayKey();

        const [calendario, cantautori] = await Promise.all([
          loadJSON('calendario.json'),
          loadJSON('cantautori.json'),
        ]);

        const songs = calendario[key];

        /* nessuna canzone per oggi */
        if (!songs || songs.length === 0) {
          if (loadingEl) loadingEl.classList.add('hidden');
          if (noSongsEl) noSongsEl.classList.remove('hidden');
          return;
        }

        /* 4. Genera le sezioni HTML */
        const html = songs.map((song, i) =>
          buildSongSection(song, i, cantautori)
        ).join('');

        songsEl.innerHTML = html;

        /* 5. Attiva le rivelazioni scroll */
        const sr = new ScrollReveal();
        sr.observe(songsEl.querySelectorAll('.sr, .sr-left, .sr-right, .stagger'));

        /* 6. Inizializza i player YouTube */
        const pm = new YTPlayerManager();
        pm.setTotalSlots(songs.length);

        pm.loadAPI(() => {
          songs.forEach((song, i) => {
            const ytId = extractYouTubeId(song.youtube);
            if (ytId) pm.createPlayer(`yt-${i}`, ytId, i);
          });
        });

      } catch (err) {
        console.error('[app] Errore caricamento dati:', err);
        if (loadingEl) {
          loadingEl.innerHTML = `
            <p style="color:var(--red);margin-bottom:.5rem">
              Errore nel caricamento dei dati.
            </p>
            <p style="color:var(--text-3);font-size:.85rem">${escHtml(err.message)}</p>`;
        }
      }
    }
  }

  /* Avvia quando il DOM è pronto */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
  } else {
    main();
  }
})();
