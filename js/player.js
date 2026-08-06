/* ============================================================
   player.js — YouTube IFrame API: riproduzione sequenziale
   ============================================================ */

class YTPlayerManager {
  constructor() {
    this._players    = [];   // YT.Player instances indicizzate per posizione
    this._videoIds   = [];   // videoId per ogni slot
    this._totalSlots = 0;
    this._apiReady   = false;
    this._pendingInit = null; // callback da eseguire quando l'API è pronta
  }

  /**
   * Carica la YT IFrame API (idempotente).
   * Chiama `callback` quando l'API è disponibile.
   */
  loadAPI(callback) {
    if (this._apiReady) { callback(); return; }

    // Salva la callback; se l'API è già in fase di caricamento,
    // onYouTubeIframeAPIReady verrà comunque chiamata.
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prev) prev();
      this._apiReady = true;
      callback();
    };

    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src   = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  }

  /**
   * Registra il numero totale di canali (uno per canzone).
   * Deve essere chiamato prima di createPlayer.
   */
  setTotalSlots(n) {
    this._totalSlots = n;
    this._players    = new Array(n).fill(null);
    this._videoIds   = new Array(n).fill(null);
  }

  /**
   * Crea un player YT nel contenitore `containerId`.
   * @param {string}  containerId  id del div target
   * @param {string}  videoId      id del video YouTube
   * @param {number}  index        posizione nella sequenza (0-based)
   */
  createPlayer(containerId, videoId, index) {
    if (!videoId || !document.getElementById(containerId)) return;

    this._videoIds[index] = videoId;

    const player = new YT.Player(containerId, {
      videoId,
      width: '100%',
      height: '100%',
      playerVars: {
        autoplay:        index === 0 ? 1 : 0,
        rel:             0,
        modestbranding:  1,
        playsinline:     1,
        enablejsapi:     1,
      },
      events: {
        onReady:       (e) => this._onReady(e, index),
        onStateChange: (e) => this._onStateChange(e, index),
        onError:       (e) => this._onError(e, index),
      },
    });

    this._players[index] = player;
    return player;
  }

  /* ---- eventi interni ---- */

  _onReady(event, index) {
    // Solo il primo video parte automaticamente
    if (index === 0) {
      event.target.playVideo();
    }
  }

  _onStateChange(event, index) {
    if (event.data !== YT.PlayerState.ENDED) return;

    const next = index + 1;
    if (next < this._totalSlots && this._players[next]) {
      this._players[next].playVideo();
      this._scrollToSong(next);
    }
  }

  _onError(event, index) {
    console.warn(`[YTPlayerManager] Errore nel player ${index}:`, event.data);
    // Se un video fallisce, passa al successivo
    const next = index + 1;
    if (next < this._totalSlots && this._players[next]) {
      this._players[next].playVideo();
    }
  }

  /** Scrolla dolcemente alla sezione della canzone `index`. */
  _scrollToSong(index) {
    const sections = document.querySelectorAll('.song-section');
    if (sections[index]) {
      sections[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

/* ---- utility: estrazione ID ---- */

/**
 * Restituisce il video ID da un URL YouTube (o null se non valido).
 * Gestisce i formati: /watch?v=, youtu.be/, /embed/
 */
function extractYouTubeId(url) {
  if (!url) return null;
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  return m ? m[1] : null;
}

/**
 * Restituisce il track ID da un URL Spotify (o null se non valido).
 */
function extractSpotifyId(url) {
  if (!url) return null;
  const m = url.match(/spotify\.com\/(?:intl-[a-z]+\/)?track\/([A-Za-z0-9]+)/);
  return m ? m[1] : null;
}
