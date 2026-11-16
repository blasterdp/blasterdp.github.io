/* ============================================================
   audio.js — Motor chiptune 8-bit con Web Audio API
   Música: melodía cuadrada + arpegio + bajo + percusión.
   Efectos: acierto, error, clic, fanfarria, cuenta atrás.
   Todo generado en tiempo real: no necesita archivos de audio.

   Reglas de vida:
   - El AudioContext no se crea hasta el primer gesto del usuario
     (política de autoplay de los navegadores móviles).
   - Cada nodo de audio se desconecta al terminar (sin fugas).
   - Al ocultar la app se suspende el contexto (no gasta batería).
   ============================================================ */

const Chiptune = (() => {
  let ctx = null;
  let master = null, musicBus = null, sfxBus = null;
  let noiseBuffer = null;

  let musicEnabled = true;
  let sfxEnabled = true;
  let timer = null;
  let step = 0;
  let nextTime = 0;
  let musicKey = 'menu';

  const MUSIC_GAIN = 0.16;
  const SFX_GAIN = 0.32;

  /* ---- Teoría: nota -> frecuencia ------------------------------- */
  const SEMITONES = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

  function freq(note) {
    const m = /^([A-G]#?)(-?\d)$/.exec(note);
    if (!m) return 440;
    const midi = SEMITONES[m[1]] + (parseInt(m[2], 10) + 1) * 12;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  /* ---- Patrones (16 pasos por compás, 4 compases = 64 pasos) ----- */
  const MELODY_MENU = [
    'E5', '-', 'E5', '-', 'G5', '-', 'A5', '-', 'G5', '-', 'E5', '-', 'D5', '-', '-', '-',
    'C5', '-', 'D5', '-', 'E5', '-', 'G5', '-', 'E5', '-', 'D5', '-', 'C5', '-', '-', '-',
    'F5', '-', 'F5', '-', 'A5', '-', 'G5', '-', 'F5', '-', 'D5', '-', 'E5', '-', '-', '-',
    'G5', '-', 'E5', '-', 'C5', '-', 'D5', '-', 'E5', '-', '-', '-', '-', '-', '-', '-'
  ];

  const MELODY_QUIZ = [
    'C5', '-', 'E5', '-', 'G5', '-', 'E5', '-', 'F5', '-', 'A5', '-', 'G5', '-', '-', '-',
    'E5', '-', 'G5', '-', 'C6', '-', 'B5', '-', 'A5', '-', 'G5', '-', 'E5', '-', '-', '-',
    'D5', '-', 'F5', '-', 'A5', '-', 'F5', '-', 'E5', '-', 'D5', '-', 'C5', '-', '-', '-',
    'G5', '-', 'F5', '-', 'E5', '-', 'D5', '-', 'C5', '-', '-', '-', '-', '-', '-', '-'
  ];

  const MELODY_WIN = [
    'C5', 'E5', 'G5', 'C6', '-', '-', '-', '-', 'A5', '-', 'C6', '-', 'E6', '-', '-', '-',
    'D6', '-', '-', '-', 'C6', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-',
    'E5', 'G5', 'C6', 'E6', '-', '-', '-', '-', 'D6', '-', '-', '-', 'G5', '-', '-', '-',
    'C5', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-'
  ];

  /* Acordes de acompañamiento: 4 acordes de un compás cada uno */
  const CHORDS = {
    menu: ['C', 'G', 'F', 'G'],
    quiz: ['C', 'F', 'G', 'G'],
    win:  ['C', 'F', 'G', 'C']
  };

  const BPM = { menu: 132, quiz: 146, win: 120 };
  const STEP = 1 / 4; // corchea (16avos)

  const patterns = { menu: MELODY_MENU, quiz: MELODY_QUIZ, win: MELODY_WIN };

  /* ---- Contexto de audio ----------------------------------------- */
  function ensureContext() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();

    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);

    musicBus = ctx.createGain();
    musicBus.gain.value = musicEnabled ? MUSIC_GAIN : 0;
    musicBus.connect(master);

    sfxBus = ctx.createGain();
    sfxBus.gain.value = sfxEnabled ? SFX_GAIN : 0;
    sfxBus.connect(master);

    // Ruido blanco reutilizable para percusión y efectos
    const len = Math.floor(ctx.sampleRate * 1);
    noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    return ctx;
  }

  function resetClock() {
    step = 0;
    nextTime = (ctx ? ctx.currentTime : 0) + 0.05;
  }

  /**
   * Se llama en el primer gesto real del usuario: crea el contexto y lo reanuda.
   * @returns {boolean} true si el audio ya está disponible
   */
  function unlock() {
    if (!ensureContext()) return false;
    if (ctx.state === 'suspended') {
      ctx.resume()
        .then(() => {
          resetClock();
          if (musicEnabled) startLoop();
        })
        .catch(() => { /* el navegador aún no permite audio */ });
    } else {
      resetClock();
    }
    return ctx.state === 'running';
  }

  function suspend() {
    if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {});
  }

  function resume() {
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume()
        .then(() => { resetClock(); if (musicEnabled) startLoop(); })
        .catch(() => {});
    }
  }

  /* ---- Voces de síntesis ----------------------------------------- */
  function release(nodes) {
    // Libera el subgrafo cuando termina la nota (evita fugas de memoria)
    setTimeout(() => {
      nodes.forEach((n) => {
        try { n.disconnect(); } catch (e) { /* ya desconectado */ }
      });
    }, 120);
  }

  function playTone(opts) {
    const c = ensureContext();
    if (!c) return;
    const t0 = opts.time !== undefined ? opts.time : c.currentTime;
    const dur = opts.dur || 0.12;
    const osc = c.createOscillator();
    const gain = c.createGain();

    osc.type = opts.type || 'square';
    osc.frequency.setValueAtTime(opts.freq, t0);
    if (opts.slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slideTo), t0 + dur);
    }

    const peak = opts.gain !== undefined ? opts.gain : 0.5;
    const attack = opts.attack !== undefined ? opts.attack : 0.008;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(gain);
    gain.connect(opts.bus || sfxBus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
    osc.onended = () => release([osc, gain]);
  }

  function playNoise(opts) {
    const c = ensureContext();
    if (!c) return;
    const t0 = opts.time !== undefined ? opts.time : c.currentTime;
    const dur = opts.dur || 0.08;
    const src = c.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;

    const filter = c.createBiquadFilter();
    filter.type = opts.filterType || 'highpass';
    filter.frequency.value = opts.filterFreq || 6000;

    const gain = c.createGain();
    const peak = opts.gain !== undefined ? opts.gain : 0.3;
    gain.gain.setValueAtTime(peak, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(opts.bus || sfxBus);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
    src.onended = () => release([src, filter, gain]);
  }

  /* ---- Percusión ------------------------------------------------- */
  function kick(time) {
    const c = ensureContext();
    if (!c) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.11);
    gain.gain.setValueAtTime(0.9, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.14);
    osc.connect(gain);
    gain.connect(musicBus);
    osc.start(time);
    osc.stop(time + 0.16);
    osc.onended = () => release([osc, gain]);
  }

  function snare(time) {
    playNoise({ time, dur: 0.11, filterType: 'bandpass', filterFreq: 1800, gain: 0.22, bus: musicBus });
    playTone({ time, dur: 0.06, type: 'triangle', freq: 220, slideTo: 140, gain: 0.16, bus: musicBus });
  }

  function hat(time) {
    playNoise({ time, dur: 0.035, filterType: 'highpass', filterFreq: 9000, gain: 0.07, bus: musicBus });
  }

  /* ---- Secuenciador ---------------------------------------------- */
  function playStep(s, time) {
    const melody = patterns[musicKey] || MELODY_MENU;
    const chordRoot = (CHORDS[musicKey] || CHORDS.menu)[Math.floor(s / 16) % 4];

    // Melodía principal (onda cuadrada)
    const note = melody[s % 64];
    if (note && note !== '-') {
      playTone({ time, dur: STEP * 1.8, type: 'square', freq: freq(note), gain: 0.34, bus: musicBus });
    }

    // Arpegio de acompañamiento (segunda cuadrada, más grave)
    if (s % 2 === 0) {
      const arp = [0, 4, 7, 12][Math.floor(s / 2) % 4];
      const arpNote = chordRoot + (arp === 12 ? '4' : '3');
      playTone({
        time, dur: STEP * 0.9, type: 'square',
        freq: freq(arpNote), gain: 0.1, bus: musicBus
      });
    }

    // Bajo (triángulo)
    const bassPattern = [0, null, null, 0, null, 0, null, null, 0, null, null, 0, null, 0, null, null];
    if (bassPattern[s % 16] !== null) {
      const bassNote = chordRoot + '2';
      playTone({ time, dur: STEP * 1.6, type: 'triangle', freq: freq(bassNote), gain: 0.5, bus: musicBus });
    }

    // Percusión
    if (s % 16 === 0 || s % 16 === 6) kick(time);
    if (s % 16 === 4 || s % 16 === 12) snare(time);
    if (s % 2 === 0) hat(time);
  }

  function scheduler() {
    if (!ctx || ctx.state !== 'running' || !musicEnabled) return;
    const stepDur = STEP * (60 / BPM[musicKey]);
    if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.01;
    while (nextTime < ctx.currentTime + 0.25) {
      playStep(step, nextTime);
      nextTime += stepDur;
      step = (step + 1) % 64;
    }
  }

  function startLoop() {
    if (timer || !ctx || ctx.state !== 'running') return;
    nextTime = ctx.currentTime + 0.05;
    timer = setInterval(scheduler, 30);
  }

  function stopLoop() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  /* ---- API pública ------------------------------------------------ */
  function startMusic(key) {
    if (key && key !== musicKey) {
      musicKey = key;
      resetClock();
    }
    if (!musicEnabled || !ctx) return;
    startLoop();
  }

  function stopMusic() {
    stopLoop();
    if (musicBus) musicBus.gain.value = 0;
  }

  function setMusicEnabled(on) {
    musicEnabled = on;
    if (!on) {
      stopMusic();
    } else {
      if (musicBus) musicBus.gain.value = MUSIC_GAIN;
      startLoop();
    }
  }

  function setSfxEnabled(on) {
    sfxEnabled = on;
    if (sfxBus) sfxBus.gain.value = on ? SFX_GAIN : 0;
  }

  /* ---- Efectos de sonido ----------------------------------------- */
  function sfx(name) {
    if (!sfxEnabled || !ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime;

    switch (name) {
      case 'click':
        playTone({ time: t, dur: 0.05, type: 'square', freq: 880, gain: 0.22 });
        break;
      case 'correct':
        playTone({ time: t, dur: 0.09, type: 'square', freq: freq('E6'), gain: 0.3 });
        playTone({ time: t + 0.09, dur: 0.09, type: 'square', freq: freq('A6'), gain: 0.3 });
        playTone({ time: t + 0.18, dur: 0.16, type: 'square', freq: freq('C7'), gain: 0.32 });
        break;
      case 'wrong':
        playTone({ time: t, dur: 0.34, type: 'sawtooth', freq: 320, slideTo: 90, gain: 0.3 });
        break;
      case 'flip':
        playTone({ time: t, dur: 0.07, type: 'triangle', freq: 620, slideTo: 900, gain: 0.18 });
        break;
      case 'hint':
        playTone({ time: t, dur: 0.08, type: 'triangle', freq: 520, gain: 0.2 });
        playTone({ time: t + 0.1, dur: 0.12, type: 'triangle', freq: 780, gain: 0.2 });
        break;
      case 'level':
        [0, 0.1, 0.2, 0.3].forEach((d, i) =>
          playTone({ time: t + d, dur: 0.12, type: 'square', freq: freq(['C5', 'E5', 'G5', 'C6'][i]), gain: 0.28 })
        );
        break;
      case 'fanfare':
        [0, 0.12, 0.24, 0.36, 0.52].forEach((d, i) =>
          playTone({ time: t + d, dur: i === 4 ? 0.5 : 0.13, type: 'square', freq: freq(['C5', 'E5', 'G5', 'C6', 'G5'][i]), gain: 0.3 })
        );
        break;
      case 'tick':
        playTone({ time: t, dur: 0.03, type: 'square', freq: 1200, gain: 0.12 });
        break;
    }
  }

  return {
    unlock,
    suspend,
    resume,
    startMusic,
    stopMusic,
    setMusicEnabled,
    setSfxEnabled,
    sfx,
    get musicEnabled() { return musicEnabled; },
    get sfxEnabled() { return sfxEnabled; },
    get ready() { return !!ctx && ctx.state === 'running'; }
  };
})();
