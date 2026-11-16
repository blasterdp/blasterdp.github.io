/* ============================================================
   app.js — Lógica del juego Álef-Bet
   Flujo: portada → preparación → estudio → examen → resultado
   ============================================================ */

(() => {
  'use strict';

  /* ---------------- Utilidades ---------------- */
  const el = (id) => document.getElementById(id);
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const pick = (arr, n) => shuffle(arr).slice(0, n);
  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* modo privado */ }
    }
  };

  /* ---------------- Estado ---------------- */
  const SETTINGS_KEY = 'alef.settings';
  const STATS_KEY = 'alef.stats';
  const PROGRESS_KEY = 'alef.progress';
  const CAMPAIGN_KEY = 'alef.campaign';
  const MEMORY_KEY = 'alef.memory';
  const DAY_MS = 86400000;
  const REVIEW_INTERVALS = [0, 1, 2, 4, 8, 16]; // días según la caja
  const LETTER_TIME = 20000; // ms por pregunta de letras
  const SOFIT_TIME = 15000;  // ms por pregunta de formas finales
  const VF_TIME = 8000;      // ms por ficha de verdadero/falso
  const WORD_TIME = 30000;   // ms por palabra (dos letras)
  const POINTS_BASE = 100;
  const POINTS_WORD = 150;

  const settings = Object.assign(
    { music: true, sfx: true },
    store.get(SETTINGS_KEY, {})
  );

  const storedStats = store.get(STATS_KEY, {});
  const stats = Object.assign(
    { best: 0, bestByMode: {}, games: 0, correct: 0, bestStreak: 0 },
    storedStats
  );
  // Migración: las versiones anteriores solo tenían un récord global (numérico).
  if (!stats.bestByMode || typeof stats.bestByMode !== 'object') stats.bestByMode = {};
  if (typeof stats.best !== 'number') stats.best = 0;

  // Progreso por letra para el repaso inteligente.
  const storedProgress = store.get(PROGRESS_KEY, {});
  const progress = storedProgress && typeof storedProgress === 'object' && !Array.isArray(storedProgress)
    ? storedProgress : {};

  // Camino de letras: mundos desbloqueados y estrellas.
  const campaign = Object.assign({ unlocked: 1, stars: {} }, store.get(CAMPAIGN_KEY, {}));
  if (!campaign.stars || typeof campaign.stars !== 'object') campaign.stars = {};
  campaign.unlocked = Math.min(Math.max(1, Number(campaign.unlocked) || 1), CAMPAIGN_LEVELS.length);

  // Récords de Parejas por configuración (4-name, 6-value...).
  const storedMemory = store.get(MEMORY_KEY, {});
  const memoryBest = storedMemory && typeof storedMemory === 'object' && !Array.isArray(storedMemory)
    ? storedMemory : {};

  const session = {
    quantity: 10,
    mode: 'name',
    letters: [],       // letras de la ronda (alfabeto)
    words: [],         // palabras de la ronda
    studyOrder: [],    // orden aleatorio de estudio
    studyIndex: 0,
    revealed: false,
    questions: [],
    qIndex: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    answered: 0,
    hits: 0,
    startedAt: 0,
    qTimer: null,
    qStart: 0,
    questionTime: LETTER_TIME,
    timerPaused: false,
    hiddenAt: 0,
    answeredCurrent: false,
    hintUsed: false,   // la pista cambia la puntuación de la pregunta
    wordPicks: [null, null], // letras elegidas por el jugador (modo palabras)
    activeSlot: 0,
    campaignLevel: null, // mundo activo, o null en juego libre
    worldLetters: null,  // letras del mundo cuando no es sofit/palabras
    studyRatings: {},    // índice de tarjeta -> 'known' | 'again'
    studyRun: 0,         // identifica la sesión de estudio actual
    memorySize: 4,       // parejas por partida
    memoryKind: 'name',  // 'name' o 'value'
    memoryCards: [],
    memoryFlipped: [],
    memoryMatched: 0,
    memoryMoves: 0,
    memoryLocked: false,
    memoryWon: false,
    memoryTimer: null,
    memoryFlipTimer: null,
    memoryStartedAt: 0,
    memoryElapsed: 0,
    memoryPausedAt: 0
  };

  /* ---------------- Navegación ---------------- */
  const SCREENS = ['home', 'setup', 'campaign', 'memory', 'study', 'quiz', 'result', 'help'];
  let currentScreen = 'home';

  function showScreen(name) {
    if (currentScreen === 'memory' && name !== 'memory') {
      stopMemoryTimer();
      clearMemoryFlipTimer();
    }
    SCREENS.forEach((s) => {
      const node = el('screen-' + s);
      if (node) node.hidden = (s !== name);
    });
    currentScreen = name;
    const node = el('screen-' + name);
    if (node) {
      const focusable = node.querySelector('[tabindex="-1"]');
      if (focusable) setTimeout(() => focusable.focus({ preventScroll: true }), 30);
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
    if (name === 'home') renderHome();
    else if (name === 'campaign') renderCampaign();
  }

  function toast(message) {
    const node = el('toast');
    node.textContent = message;
    node.hidden = false;
    clearTimeout(node._timer);
    node._timer = setTimeout(() => { node.hidden = true; }, 2200);
  }

  /* ---------------- Progreso y repaso ---------------- */
  const FINAL_TO_BASE = {};
  FINAL_PAIRS.forEach((pair) => { FINAL_TO_BASE[pair.final] = pair.base; });
  const baseLetterChar = (ch) => FINAL_TO_BASE[ch] || ch;

  function isReviewDue(entry) {
    if (!entry || !entry.seen) return false;
    const box = Math.max(0, Math.min(Number(entry.box) || 0, REVIEW_INTERVALS.length - 1));
    return Date.now() >= (Number(entry.last) || 0) + REVIEW_INTERVALS[box] * DAY_MS;
  }

  function pendingReviewCount() {
    return HEBREW_LETTERS.filter((letter) => {
      const entry = progress[letter.char];
      return !entry || !entry.seen || isReviewDue(entry);
    }).length;
  }

  function pickReviewLetters(n) {
    const entries = HEBREW_LETTERS.map((letter) => {
      const entry = progress[letter.char] || null;
      return {
        letter,
        unseen: !entry || !entry.seen,
        due: isReviewDue(entry),
        box: entry ? Number(entry.box) || 0 : 0,
        last: entry ? Number(entry.last) || 0 : 0
      };
    });
    const due = shuffle(entries.filter((e) => e.due));
    const unseen = shuffle(entries.filter((e) => e.unseen));
    const rest = entries
      .filter((e) => !e.due && !e.unseen)
      .sort((a, b) => (a.box - b.box) || (a.last - b.last));
    return due.concat(unseen, rest).slice(0, n).map((e) => e.letter);
  }

  /* Cada acierto sube la caja (1→5) y cada fallo la reinicia y la deja
     vencida, para que el repaso la vuelva a proponer. */
  function recordLettersResult(chars, correct) {
    const unique = [...new Set(chars.map(baseLetterChar))];
    if (!unique.length) return;

    const now = Date.now();
    unique.forEach((ch) => {
      const entry = progress[ch] || { seen: 0, hits: 0, box: 0, last: 0 };
      entry.seen = (Number(entry.seen) || 0) + 1;
      if (correct) {
        entry.hits = (Number(entry.hits) || 0) + 1;
        entry.box = Math.min((Number(entry.box) || 0) + 1, 5);
        entry.last = now;
      } else {
        entry.box = 1;
        entry.last = now - REVIEW_INTERVALS[1] * DAY_MS;
      }
      progress[ch] = entry;
    });
    store.set(PROGRESS_KEY, progress);
  }

  function recordQuestionProgress(q, correct) {
    if (!q) return;
    let chars = [];
    if (q.ask === 'words') chars = q.word.letters;
    else if (q.letter) chars = [q.letter.char];
    recordLettersResult(chars, correct);
  }

  function campaignStars() {
    return CAMPAIGN_LEVELS.reduce((sum, level) => sum + (Number(campaign.stars[level.id]) || 0), 0);
  }

  function isCampaignComplete() {
    return CAMPAIGN_LEVELS.every((level) => (Number(campaign.stars[level.id]) || 0) >= 1);
  }

  /* ---------------- Portada ---------------- */
  function renderHome() {
    el('stat-best').textContent = stats.best > 0 ? stats.best : '—';
    el('stat-games').textContent = stats.games;
    el('stat-correct').textContent = stats.correct;

    const stars = campaignStars();
    el('campaign-progress').textContent = isCampaignComplete()
      ? 'Completado · ' + stars + '/' + CAMPAIGN_TOTAL_STARS + ' ★'
      : 'Mundo ' + campaign.unlocked + ' · ' + stars + '/' + CAMPAIGN_TOTAL_STARS + ' ★';

    const pending = pendingReviewCount();
    el('review-count').textContent = pending ? '· ' + pending + ' pendientes' : '· al día';
  }

  /* ---------------- Preparación ---------------- */
  const isWordMode = () => session.mode === 'words';
  const isSofitMode = () => session.mode === 'sofit';
  const isTrueFalseMode = () => session.mode === 'truefalse';
  const isReviewMode = () => session.mode === 'review';

  function currentChoices() {
    if (isWordMode()) return WORD_QUANTITY_CHOICES;
    if (isSofitMode()) return SOFIT_QUANTITY_CHOICES;
    if (isTrueFalseMode()) return VF_QUANTITY_CHOICES;
    if (isReviewMode()) return REVIEW_QUANTITY_CHOICES;
    return QUANTITY_CHOICES;
  }

  function buildSetup() {
    // Entrar en la preparación siempre es juego libre, no un mundo del camino.
    session.campaignLevel = null;
    session.worldLetters = null;

    const choices = currentChoices();
    if (!choices.includes(session.quantity)) session.quantity = choices[0];
    // V/F usa una muestra aleatoria y Repaso prioriza las letras pendientes
    if (isTrueFalseMode()) session.letters = pick(HEBREW_LETTERS, session.quantity);
    if (isReviewMode()) session.letters = pickReviewLetters(session.quantity);

    const qWrap = el('quantity-chips');
    qWrap.innerHTML = '';
    choices.forEach((q) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = q;
      b.setAttribute('aria-pressed', String(q === session.quantity));
      b.addEventListener('click', () => {
        session.quantity = q;
        if (isTrueFalseMode()) session.letters = pick(HEBREW_LETTERS, q);
        if (isReviewMode()) session.letters = pickReviewLetters(q);
        Chiptune.sfx('click');
        [...qWrap.children].forEach((c) => c.setAttribute('aria-pressed', 'false'));
        b.setAttribute('aria-pressed', 'true');
        renderPreview();
      });
      qWrap.appendChild(b);
    });

    const questionMode = isSofitMode() || isTrueFalseMode() || isReviewMode();
    el('quantity-title').textContent = isWordMode() ? 'Palabras'
      : questionMode ? 'Preguntas' : 'Cantidad';
    el('quantity-chips').setAttribute('aria-label',
      isWordMode() ? 'Cantidad de palabras'
        : questionMode ? 'Cantidad de preguntas' : 'Cantidad de letras');
    el('setup-title').textContent = isWordMode()
      ? 'Elige cuántas palabras'
      : isSofitMode() ? 'Practica las formas finales'
        : isTrueFalseMode() ? 'Verdadero o falso'
          : isReviewMode() ? 'Repaso inteligente' : 'Elige cuántas letras';
    el('setup-lead').textContent = isWordMode()
      ? 'Palabras de dos letras que vas a practicar en esta ronda.'
      : isSofitMode()
        ? '5 preguntas (una por pareja) o 10 (letra y forma final, ida y vuelta).'
        : isTrueFalseMode()
          ? 'Decide si cada ficha (nombre y valor) es correcta. La mitad son falsas.'
          : isReviewMode()
            ? 'Prioriza las letras que fallas o llevan tiempo sin salir.'
            : 'Cantidad de letras a memorizar en esta ronda.';

    const mWrap = el('mode-chips');
    mWrap.innerHTML = '';
    QUIZ_MODES.forEach((mode) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = mode.label;
      b.title = mode.desc;
      b.setAttribute('aria-pressed', String(mode.id === session.mode));
      b.addEventListener('click', () => {
        session.mode = mode.id;
        Chiptune.sfx('click');
        buildSetup();
      });
      mWrap.appendChild(b);
    });

    renderModeDesc();
    renderPreview();
  }

  function renderModeDesc() {
    const mode = QUIZ_MODES.find((m) => m.id === session.mode);
    if (!mode) {
      el('mode-desc').textContent = '';
      return;
    }
    const best = stats.bestByMode[session.mode] || 0;
    el('mode-desc').textContent = mode.desc + (best > 0 ? ' · Récord: ' + best + ' pts' : '');
  }

  function renderPreview() {
    const wrap = el('letter-preview');
    wrap.innerHTML = '';
    const label = el('preview-label');

    if (isSofitMode()) {
      label.textContent = 'Parejas de la ronda';
      FINAL_PAIRS.forEach((p, i) => {
        const s = document.createElement('span');
        s.className = 'preview__pair';
        s.title = p.name + ': ' + p.base + ' → ' + p.final;
        s.style.animationDelay = (i * 28) + 'ms';

        const base = document.createElement('span');
        base.className = 'preview__pair-glyph';
        base.lang = 'he';
        base.dir = 'rtl';
        base.textContent = p.base;

        const arrow = document.createElement('span');
        arrow.className = 'preview__pair-arrow';
        arrow.setAttribute('aria-hidden', 'true');
        arrow.textContent = '→';

        const fin = document.createElement('span');
        fin.className = 'preview__pair-glyph';
        fin.lang = 'he';
        fin.dir = 'rtl';
        fin.textContent = p.final;

        s.appendChild(base);
        s.appendChild(arrow);
        s.appendChild(fin);
        wrap.appendChild(s);
      });
      return;
    }

    if (isWordMode()) {
      label.textContent = 'Palabras de la ronda';
      HEBREW_WORDS.slice(0, session.quantity).forEach((w, i) => {
        const s = document.createElement('span');
        s.className = 'preview__word';
        s.innerHTML = '';
        const g = document.createElement('span');
        g.className = 'preview__word-glyph';
        g.lang = 'he';
        g.dir = 'rtl';
        g.textContent = w.word;
        const t = document.createElement('span');
        t.className = 'preview__word-translit';
        t.textContent = w.translit;
        s.appendChild(g);
        s.appendChild(t);
        s.title = w.meaning;
        s.style.animationDelay = (i * 28) + 'ms';
        wrap.appendChild(s);
      });
      return;
    }

    label.textContent = isReviewMode() ? 'Letras del repaso' : 'Letras de la ronda';
    const letters = (isTrueFalseMode() || isReviewMode())
      ? session.letters
      : HEBREW_LETTERS.slice(0, session.quantity);
    letters.forEach((l, i) => {
      const s = document.createElement('span');
      s.className = 'preview__letter';
      s.textContent = l.char;
      s.style.animationDelay = (i * 28) + 'ms';
      s.title = l.name;
      wrap.appendChild(s);
    });
  }

  /* ---------------- Estudio ---------------- */
  function prepareRound() {
    if (isWordMode()) {
      session.words = HEBREW_WORDS.slice(0, session.quantity);
      session.studyOrder = shuffle(session.words);
    } else if (isSofitMode()) {
      session.letters = HEBREW_LETTERS.filter((l) => l.final);
      session.studyOrder = shuffle(session.letters);
    } else if (isTrueFalseMode()) {
      if (session.letters.length !== session.quantity) {
        session.letters = pick(HEBREW_LETTERS, session.quantity);
      }
      session.studyOrder = shuffle(session.letters);
    } else if (isReviewMode()) {
      if (session.letters.length !== session.quantity) {
        session.letters = pickReviewLetters(session.quantity);
      }
      session.studyOrder = shuffle(session.letters);
    } else if (session.worldLetters && session.worldLetters.length) {
      session.letters = session.worldLetters.slice();
      session.studyOrder = shuffle(session.letters);
    } else {
      session.letters = HEBREW_LETTERS.slice(0, session.quantity);
      session.studyOrder = shuffle(session.letters);
    }
  }

  function startStudy() {
    prepareRound();
    session.studyIndex = 0;
    session.studyRatings = {};
    session.studyRun++;
    renderStudy();
    showScreen('study');
  }

  function renderStudy() {
    const item = session.studyOrder[session.studyIndex];

    el('study-counter').textContent = (session.studyIndex + 1) + ' / ' + session.studyOrder.length;

    if (isWordMode()) {
      el('study-label').textContent = 'PALABRA';
      el('study-prompt').innerHTML = 'Toca <strong>revelar</strong> para ver su significado';
      el('study-glyph').textContent = item.word;
      el('study-glyph-back').textContent = item.word;
      el('study-name').textContent = item.translit;
      el('study-value-label').textContent = 'Significado:';
      el('study-value').textContent = item.meaning;

      const bd = el('study-breakdown');
      bd.innerHTML = '';
      item.letters.forEach((ch, i) => {
        if (i > 0) {
          const plus = document.createElement('span');
          plus.className = 'flash__plus';
          plus.textContent = '+';
          bd.appendChild(plus);
        }
        const box = document.createElement('span');
        box.className = 'flash__piece';
        box.lang = 'he';
        box.dir = 'rtl';
        box.textContent = ch;
        bd.appendChild(box);
      });
      bd.hidden = false;

      el('study-hint').textContent = item.note || '';
      el('study-final').hidden = true;
      el('study-say-row').hidden = true;
    } else {
      el('study-label').textContent = 'LETRA';
      el('study-prompt').innerHTML = isSofitMode()
        ? 'Toca <strong>revelar</strong> para ver su forma final'
        : 'Toca <strong>revelar</strong> para ver su nombre y su valor';
      el('study-glyph').textContent = item.char;
      el('study-glyph-back').textContent = item.char;
      el('study-name').textContent = item.name;
      el('study-say').textContent = item.say || '—';
      el('study-say-row').hidden = false;
      el('study-value-label').textContent = 'Valor gematría:';
      el('study-value').textContent = item.value;
      el('study-breakdown').hidden = true;
      el('study-hint').textContent = item.hint;

      const finalNode = el('study-final');
      if (item.final) {
        finalNode.innerHTML = 'Forma final: <span class="flash__final-glyph" lang="he" dir="rtl">' +
          item.final + '</span>';
        finalNode.hidden = false;
      } else {
        finalNode.hidden = true;
      }
    }

    el('study-card').classList.remove('is-flipped');
    el('study-flash').classList.remove('is-flipped');
    el('study-back').setAttribute('aria-hidden', 'true');
    session.revealed = false;
    el('btn-study-flip').textContent = 'Revelar';

    const dots = el('study-dots');
    dots.innerHTML = '';
    session.studyOrder.forEach((_, i) => {
      const d = document.createElement('span');
      d.className = 'dot' + (i === session.studyIndex ? ' is-current' : (i < session.studyIndex ? ' is-done' : ''));
      dots.appendChild(d);
    });

    el('btn-study-prev').disabled = session.studyIndex === 0;
    el('btn-study-next').disabled = session.studyIndex === session.studyOrder.length - 1;
    el('study-rating').hidden = true;
    el('study-rating-note').hidden = true;
    updateStudySummary();
  }

  function flipStudyCard() {
    if (session.revealed) return;
    session.revealed = true;
    el('study-flash').classList.add('is-flipped');
    el('study-back').setAttribute('aria-hidden', 'false');
    el('btn-study-flip').textContent = 'Ocultar';
    Chiptune.sfx('flip');
  }

  function moveStudy(delta) {
    const next = session.studyIndex + delta;
    if (next < 0 || next >= session.studyOrder.length) return;
    session.studyIndex = next;
    Chiptune.sfx('click');
    renderStudy();
  }

  function syncStudyRating() {
    const rated = session.studyRatings[session.studyIndex];
    const again = el('btn-study-again');
    const known = el('btn-study-known');
    again.disabled = Boolean(rated);
    known.disabled = Boolean(rated);

    const note = el('study-rating-note');
    if (rated === 'known') {
      note.hidden = false;
      note.textContent = 'Ya marcaste que la sabías.';
    } else if (rated === 'again') {
      note.hidden = false;
      note.textContent = 'Ya marcaste que no la sabías.';
    } else {
      note.hidden = true;
      note.textContent = '';
    }
  }

  function toggleStudyReveal() {
    if (session.revealed) {
      el('study-flash').classList.remove('is-flipped');
      el('study-back').setAttribute('aria-hidden', 'true');
      el('btn-study-flip').textContent = 'Revelar';
      session.revealed = false;
      el('study-rating').hidden = true;
      el('study-rating-note').hidden = true;
    } else {
      flipStudyCard();
      el('study-rating').hidden = false;
      syncStudyRating();
    }
  }

  function updateStudySummary() {
    const total = session.studyOrder.length;
    let known = 0;
    let again = 0;
    Object.keys(session.studyRatings).forEach((key) => {
      if (session.studyRatings[key] === 'known') known++;
      else if (session.studyRatings[key] === 'again') again++;
    });
    const unmarked = Math.max(0, total - known - again);

    let text;
    if (known + again === 0) {
      text = 'Marca cada tarjeta al revelarla.';
    } else if (unmarked === 0) {
      text = 'Sabidas ' + known + ' · A repasar ' + again + ' · ¡todo repasado!';
    } else {
      text = 'Sabidas ' + known + ' · A repasar ' + again + ' · ' + unmarked + ' sin marcar';
    }
    el('study-summary').textContent = text;
  }

  /* La marca de la tarjeta alimenta el mismo progreso por letra que el examen. */
  function rateStudyCard(rating) {
    if (!session.revealed) return;
    if (session.studyRatings[session.studyIndex]) return;
    const item = session.studyOrder[session.studyIndex];
    if (!item) return;

    const correct = rating === 'known';
    const run = session.studyRun;
    session.studyRatings[session.studyIndex] = rating;
    recordLettersResult(isWordMode() ? item.letters : [item.char], correct);
    Chiptune.sfx(correct ? 'correct' : 'hint');
    syncStudyRating();
    updateStudySummary();

    const ratedIndex = session.studyIndex;
    if (ratedIndex < session.studyOrder.length - 1) {
      setTimeout(() => {
        if (currentScreen !== 'study') return;
        if (!session.revealed) return;
        if (session.studyRun !== run) return;
        if (session.studyIndex !== ratedIndex) return;
        if (session.studyRatings[ratedIndex] !== rating) return;
        moveStudy(1);
      }, 280);
    }
  }

  /* ---------------- Examen ---------------- */
  function buildQuestions() {
    if (isWordMode()) {
      session.questions = shuffle(session.words).map((word) => ({ ask: 'words', word }));
      return;
    }

    if (isSofitMode()) {
      session.questions = buildSofitQuestions();
      return;
    }

    if (isTrueFalseMode()) {
      session.questions = buildTrueFalseQuestions();
      return;
    }

    const letters = session.letters;
    const mode = session.mode;

    session.questions = shuffle(letters).map((letter) => {
      const ask = (mode === 'mix' || mode === 'review')
        ? pick(['name', 'value', 'glyph'], 1)[0]
        : mode;

      // Qué se muestra y qué se elige en cada dirección
      const labelOf = (l) =>
        ask === 'name' ? l.name : ask === 'value' ? String(l.value) : l.char;

      const correct = labelOf(letter);
      const correctText = ask === 'glyph' ? letter.char + ' (' + letter.name + ')' : correct;

      const pool = letters.filter((l) => l !== letter);
      const distractors = pick(pool, Math.min(3, pool.length)).map(labelOf);

      const options = shuffle([correct, ...distractors]).map((label) => ({
        label,
        correct: label === correct
      }));

      return { letter, ask, correct, correctText, options };
    });
  }

  /* Opciones de glifo: la correcta + 3 distractores del mismo grupo */
  function glyphOptions(correct, pool) {
    const distractors = pick(pool.filter((c) => c !== correct), Math.min(3, pool.length - 1));
    return shuffle([correct, ...distractors]).map((label) => ({
      label,
      correct: label === correct
    }));
  }

  /* Formas finales: 5 preguntas (una por pareja) o 10 (ida y vuelta) */
  function buildSofitQuestions() {
    const bases = FINAL_PAIRS.map((p) => p.base);
    const finals = FINAL_PAIRS.map((p) => p.final);
    const questions = [];

    FINAL_PAIRS.forEach((p) => {
      const letter = HEBREW_LETTERS.find((l) => l.char === p.base);
      const pair = [];

      pair.push({
        ask: 'sofit',
        direction: 'final',
        letter,
        show: p.base,
        prompt: '¿Cuál es su forma final?',
        hint: p.hint,
        correct: p.final,
        correctText: p.final + ' (forma final de ' + p.name + ')',
        options: glyphOptions(p.final, finals)
      });

      pair.push({
        ask: 'sofit',
        direction: 'base',
        letter,
        show: p.final,
        prompt: '¿A qué letra corresponde?',
        hint: p.hint,
        correct: p.base,
        correctText: p.base + ' (' + p.name + ')',
        options: glyphOptions(p.base, bases)
      });

      if (session.quantity === 5) {
        questions.push(pair[Math.floor(Math.random() * pair.length)]);
      } else {
        questions.push(pair[0], pair[1]);
      }
    });

    return shuffle(questions);
  }

  /* V/F: la mitad de las fichas son falsas. Se cambia solo el nombre o solo
     el valor por el de otra letra, para que la mentira sea plausible. */
  function buildTrueFalseQuestions() {
    const letters = shuffle(session.letters);
    const falseCount = Math.floor(letters.length / 2);
    const falseFlags = shuffle(letters.map((_, i) => i < falseCount));

    return letters.map((letter, i) => {
      const truth = !falseFlags[i];
      let name = letter.name;
      let value = letter.value;

      if (!truth) {
        const other = pick(HEBREW_LETTERS.filter((l) => l !== letter), 1)[0];
        if (Math.random() < 0.5) name = other.name;
        else value = other.value;
      }

      return {
        ask: 'truefalse',
        letter,
        show: letter.char,
        prompt: '¿La ficha es correcta?',
        claim: name + ' · valor ' + value,
        truth,
        correctText: (truth ? 'Verdadero' : 'Falso') + ': ' + letter.char + ' es ' +
          letter.name + ' y vale ' + letter.value + '.',
        options: [
          { label: 'Verdadero', correct: truth },
          { label: 'Falso', correct: !truth }
        ]
      };
    });
  }

  function startQuiz() {
    prepareRound();
    buildQuestions();
    session.qIndex = 0;
    session.score = 0;
    session.streak = 0;
    session.bestStreak = 0;
    session.hits = 0;
    session.answered = 0;
    session.startedAt = Date.now();
    Chiptune.startMusic('quiz');
    renderQuestion();
    showScreen('quiz');
  }

  function renderQuestion() {
    const q = session.questions[session.qIndex];
    session.answeredCurrent = false;
    session.hintUsed = false;

    if (q.ask === 'words') {
      renderWordQuestion(q);
      return;
    }

    const prompts = { name: 'Elige el nombre', value: 'Elige el valor', glyph: 'Elige la letra' };

    el('quiz-progress').textContent = 'Pregunta ' + (session.qIndex + 1) + ' / ' + session.questions.length;
    el('quiz-score').textContent = session.score + ' pts';
    el('quiz-prompt').textContent = q.prompt || prompts[q.ask];
    session.questionTime = q.ask === 'truefalse' ? VF_TIME
      : q.ask === 'sofit' ? SOFIT_TIME : LETTER_TIME;

    // "Letra" muestra el nombre y pide el glifo; el resto muestra el glifo.
    const showGlyph = q.ask !== 'glyph';
    const optionsGlyph = q.ask === 'glyph' || q.ask === 'sofit';
    const isTrueFalse = q.ask === 'truefalse';
    el('quiz-glyph').hidden = !showGlyph;
    el('quiz-word').hidden = showGlyph;
    el('quiz-meaning').hidden = true;
    el('quiz-meaning').textContent = '';
    el('quiz-slots').hidden = true;
    el('quiz-claim').hidden = !isTrueFalse;
    el('quiz-claim').textContent = isTrueFalse ? q.claim : '';
    if (!showGlyph) {
      el('quiz-word').textContent = q.letter.name;
    } else {
      el('quiz-glyph').textContent = q.show || q.letter.char;
      el('quiz-word').textContent = '';
    }

    el('quiz-hint').hidden = true;
    el('quiz-hint').textContent = '';
    el('btn-hint').hidden = isTrueFalse;
    el('btn-hint').disabled = isTrueFalse;
    el('btn-hint').textContent = '💡 Pista (−25 pts)';

    const streakNode = el('streak');
    if (session.streak > 1) {
      streakNode.hidden = false;
      el('streak-count').textContent = session.streak;
    } else {
      streakNode.hidden = true;
    }

    const wrap = el('quiz-options');
    wrap.innerHTML = '';
    q.options.forEach((opt, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      // En V/F el verde queda para "Verdadero" y el rosa para "Falso"
      const color = isTrueFalse ? (opt.label === 'Verdadero' ? 3 : 1) : i + 1;
      b.className = 'option option--' + color + (optionsGlyph ? ' option--glyph' : '');
      b.textContent = opt.label;
      if (optionsGlyph) {
        b.dir = 'rtl';
        b.setAttribute('lang', 'he');
      }
      b.dataset.correct = String(opt.correct);
      b.setAttribute('aria-keyshortcuts', String(i + 1));
      b.addEventListener('click', () => answer(opt, b));
      wrap.appendChild(b);
    });

    el('quiz-feedback').textContent = '';
    el('quiz-feedback').className = 'feedback';
    el('btn-quiz-next').hidden = true;
    el('btn-quiz-next').textContent = 'Siguiente ▶';

    startTimer();
  }

  /* ---------------- Examen de palabras ---------------- */
  function renderWordQuestion(q) {
    const w = q.word;
    session.questionTime = WORD_TIME;
    session.hintUsed = false;
    el('quiz-claim').hidden = true;
    el('quiz-claim').textContent = '';
    el('btn-hint').hidden = false;

    el('quiz-progress').textContent = 'Pregunta ' + (session.qIndex + 1) + ' / ' + session.questions.length;
    el('quiz-score').textContent = session.score + ' pts';
    el('quiz-glyph').hidden = true;
    el('quiz-word').hidden = false;
    el('quiz-word').textContent = w.translit;
    el('quiz-meaning').hidden = false;
    el('quiz-meaning').textContent = w.meaning;
    el('quiz-slots').hidden = false;

    el('quiz-hint').hidden = true;
    el('quiz-hint').textContent = '';
    el('btn-hint').disabled = false;
    el('btn-hint').textContent = '💡 Pista (−25 pts)';

    const streakNode = el('streak');
    if (session.streak > 1) {
      streakNode.hidden = false;
      el('streak-count').textContent = session.streak;
    } else {
      streakNode.hidden = true;
    }

    session.wordPicks = [null, null];
    session.activeSlot = 0;
    resetSlots();
    paintSlots();
    renderWordOptions();

    el('quiz-feedback').textContent = '';
    el('quiz-feedback').className = 'feedback';
    el('btn-quiz-next').hidden = true;
    el('btn-quiz-next').textContent = 'Siguiente ▶';

    startTimer();
  }

  /* Letras candidatas para la posición indicada:
     si la respuesta es una forma final, las opciones son formas finales */
  function poolForSlot(word, slot) {
    const answer = word.letters[slot];
    const group = FINAL_CHARS.includes(answer) ? FINAL_CHARS : PLAIN_CHARS;
    const others = group.filter((c) => c !== answer);
    return shuffle([answer, ...pick(others, 3)]);
  }

  function renderWordOptions() {
    const w = session.questions[session.qIndex].word;
    const options = poolForSlot(w, session.activeSlot);
    const wrap = el('quiz-options');
    wrap.innerHTML = '';
    options.forEach((label, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'option option--' + (i + 1) + ' option--glyph';
      b.textContent = label;
      b.dir = 'rtl';
      b.setAttribute('lang', 'he');
      b.setAttribute('aria-keyshortcuts', String(i + 1));
      b.addEventListener('click', () => pickLetter(label));
      wrap.appendChild(b);
    });
    el('quiz-prompt').textContent = session.activeSlot === 0 ? 'Elige la 1ª letra' : 'Elige la 2ª letra';
  }

  function resetSlots() {
    [0, 1].forEach((i) => {
      const slot = el('slot-' + (i + 1));
      slot.classList.remove('is-active', 'is-correct', 'is-wrong');
      slot.querySelector('.slot__glyph').textContent = '';
    });
  }

  function paintSlots() {
    [0, 1].forEach((i) => {
      const slot = el('slot-' + (i + 1));
      const glyph = slot.querySelector('.slot__glyph');
      glyph.textContent = session.wordPicks[i] || '?';
      slot.classList.toggle('is-active', i === session.activeSlot && !session.answeredCurrent);
      const pos = i === 0 ? 'Primera letra' : 'Segunda letra';
      slot.setAttribute('aria-label', pos + ': ' + (session.wordPicks[i] || 'sin elegir'));
    });
  }

  function pickLetter(letter) {
    if (session.answeredCurrent) return;
    session.wordPicks[session.activeSlot] = letter;
    Chiptune.sfx('click');
    paintSlots();

    const next = session.wordPicks.findIndex((p) => p === null);
    if (next === -1) {
      checkWord();
      return;
    }
    session.activeSlot = next;
    paintSlots();
    renderWordOptions();
  }

  function checkWord() {
    session.answeredCurrent = true;
    stopTimer();
    const w = session.questions[session.qIndex].word;
    const ok = session.wordPicks[0] === w.letters[0] && session.wordPicks[1] === w.letters[1];

    [0, 1].forEach((i) => {
      const slot = el('slot-' + (i + 1));
      slot.classList.remove('is-active');
      slot.classList.add(session.wordPicks[i] === w.letters[i] ? 'is-correct' : 'is-wrong');
    });

    const buttons = [...el('quiz-options').children];
    buttons.forEach((b) => {
      b.disabled = true;
      if (b.textContent.trim() === w.letters[session.activeSlot]) {
        b.classList.add('is-correct');
        b.textContent += ' ✓';
      } else {
        b.classList.add('is-dim');
      }
    });

    const elapsed = Date.now() - session.qStart;
    const assisted = session.hintUsed;
    let points = 0;
    if (ok) {
      session.hits++;
      session.streak++;
      session.bestStreak = Math.max(session.bestStreak, session.streak);
      if (assisted) {
        // Con pista ya se ha visto una de las dos letras: media base y sin bonus.
        points = Math.round(POINTS_WORD * 0.5);
      } else {
        const speed = Math.round(50 * Math.max(0, 1 - elapsed / session.questionTime));
        const streakBonus = Math.min(session.streak * 10, 50);
        points = POINTS_WORD + speed + streakBonus;
      }
      Chiptune.sfx('correct');
    } else {
      session.streak = 0;
      Chiptune.sfx('wrong');
    }

    const msg = ok
      ? '¡Correcto! ' + w.word + ' = ' + w.translit + ' (' + w.meaning + ') +' + points + ' pts' +
        (assisted ? ' · con pista' : '')
      : 'Casi. Era ' + w.word + ' = ' + w.translit + ' (' + w.meaning + ')';

    finishAnswer(ok, msg, points);
  }

  function startTimer(resume) {
    stopTimer();
    if (!resume) session.qStart = Date.now();
    const total = session.questionTime;
    const bar = el('timerbar');
    const fill = el('timerbar-fill');
    bar.classList.remove('is-low');
    bar.setAttribute('aria-valuemax', String(Math.round(total / 1000)));
    fill.style.width = '100%';
    setTimerAria(total);
    session.qTimer = setInterval(() => {
      const left = Math.max(0, total - (Date.now() - session.qStart));
      fill.style.width = (left / total) * 100 + '%';
      setTimerAria(left);
      if (left < 5000) bar.classList.add('is-low');
      if (left <= 0) {
        stopTimer();
        timeoutAnswer();
      }
    }, 100);
  }

  function setTimerAria(ms) {
    const bar = el('timerbar');
    const seconds = Math.ceil(ms / 1000);
    bar.setAttribute('aria-valuenow', String(seconds));
    bar.setAttribute('aria-valuetext', seconds + ' segundos restantes');
  }

  function stopTimer() {
    if (session.qTimer) { clearInterval(session.qTimer); session.qTimer = null; }
    session.timerPaused = false;
  }

  function timeoutAnswer() {
    if (session.answeredCurrent) return;
    session.answeredCurrent = true;
    const q = session.questions[session.qIndex];

    if (q.ask === 'words') {
      const w = q.word;
      [0, 1].forEach((i) => {
        const slot = el('slot-' + (i + 1));
        slot.classList.remove('is-active');
        slot.classList.add(session.wordPicks[i] === w.letters[i] ? 'is-correct' : 'is-wrong');
      });
      const buttons = [...el('quiz-options').children];
      buttons.forEach((b) => {
        b.disabled = true;
        if (b.textContent.trim() === w.letters[session.activeSlot]) {
          b.classList.add('is-correct');
          b.textContent += ' ✓';
        } else {
          b.classList.add('is-dim');
        }
      });
      session.streak = 0;
      finishAnswer(false, '¡Se acabó el tiempo! Era ' + w.word + ' = ' + w.translit + ' (' + w.meaning + ').', 0);
      return;
    }

    const buttons = [...el('quiz-options').children];
    buttons.forEach((b) => {
      b.disabled = true;
      if (b.dataset.correct === 'true') {
        b.classList.add('is-correct');
        b.textContent += ' ✓';
      } else {
        b.classList.add('is-dim');
      }
    });
    session.streak = 0;
    finishAnswer(false, '¡Se acabó el tiempo! La respuesta era ' + q.correctText + '.', 0);
  }

  function answer(opt, button) {
    if (session.answeredCurrent) return;
    session.answeredCurrent = true;
    stopTimer();

    const elapsed = Date.now() - session.qStart;
    const buttons = [...el('quiz-options').children];

    buttons.forEach((b) => {
      b.disabled = true;
      if (b.dataset.correct === 'true') {
        b.classList.add('is-correct');
        b.textContent += ' ✓';
      } else if (b === button) {
        b.classList.add('is-wrong');
        b.textContent += ' ✗';
      } else {
        b.classList.add('is-dim');
      }
    });

    let points = 0;
    if (opt.correct) {
      session.hits++;
      session.streak++;
      session.bestStreak = Math.max(session.bestStreak, session.streak);
      const speed = Math.round(50 * Math.max(0, 1 - elapsed / session.questionTime));
      const streakBonus = Math.min(session.streak * 10, 50);
      points = POINTS_BASE + speed + streakBonus;
      Chiptune.sfx('correct');
    } else {
      session.streak = 0;
      Chiptune.sfx('wrong');
    }

    const q = session.questions[session.qIndex];
    // En Letra y Finales la respuesta correcta aporta más información que la opción
    const detail = q.correctText !== opt.label ? q.correctText + ' · ' : '';
    const msg = opt.correct
      ? '¡Correcto! ' + detail + '+' + points + ' pts'
      : 'No era ' + opt.label + '. La respuesta es ' + q.correctText + '.';

    finishAnswer(opt.correct, msg, points);
  }

  function finishAnswer(correct, message, points) {
    session.answered++;
    recordQuestionProgress(session.questions[session.qIndex], correct);
    session.score += points;
    el('quiz-score').textContent = session.score + ' pts';
    el('btn-hint').disabled = true;

    const fb = el('quiz-feedback');
    fb.textContent = message;
    fb.className = 'feedback ' + (correct ? 'is-ok' : 'is-bad');

    const next = el('btn-quiz-next');
    next.hidden = false;
    next.textContent = session.qIndex === session.questions.length - 1 ? 'Ver resultado 🏁' : 'Siguiente ▶';
    next.focus({ preventScroll: true });
  }

  function nextQuestion() {
    session.qIndex++;
    if (session.qIndex >= session.questions.length) {
      finishQuiz();
      return;
    }
    Chiptune.sfx('click');
    renderQuestion();
  }

  function showHint() {
    if (session.answeredCurrent) return;
    const q = session.questions[session.qIndex];
    if (q.ask === 'truefalse') return;
    session.hintUsed = true;

    if (q.ask === 'words') {
      // La pista revela la letra correcta de la posición activa
      const w = q.word;
      session.wordPicks[session.activeSlot] = w.letters[session.activeSlot];
      session.score = Math.max(0, session.score - 25);
      el('quiz-score').textContent = session.score + ' pts';
      el('btn-hint').disabled = true;
      Chiptune.sfx('hint');
      paintSlots();
      const next = session.wordPicks.findIndex((p) => p === null);
      if (next === -1) {
        checkWord();
      } else {
        session.activeSlot = next;
        paintSlots();
        renderWordOptions();
      }
      return;
    }

    el('quiz-hint').hidden = false;
    el('quiz-hint').textContent = 'Pista: ' + (q.hint || q.letter.hint);
    el('btn-hint').disabled = true;
    session.score = Math.max(0, session.score - 25);
    el('quiz-score').textContent = session.score + ' pts';
    Chiptune.sfx('hint');
  }

  /* ---------------- Parejas (memoria) ---------------- */
  function memoryKey() {
    return session.memorySize + '-' + session.memoryKind;
  }

  function formatMemoryTime(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return minutes + ':' + (seconds < 10 ? '0' + seconds : String(seconds));
  }

  function stopMemoryTimer() {
    if (session.memoryTimer) {
      clearInterval(session.memoryTimer);
      session.memoryTimer = null;
    }
  }

  function clearMemoryFlipTimer() {
    if (session.memoryFlipTimer) {
      clearTimeout(session.memoryFlipTimer);
      session.memoryFlipTimer = null;
    }
  }

  function startMemoryTimer() {
    stopMemoryTimer();
    session.memoryTimer = setInterval(() => {
      if (!session.memoryStartedAt || session.memoryWon) return;
      session.memoryElapsed = Date.now() - session.memoryStartedAt;
      const text = formatMemoryTime(session.memoryElapsed);
      el('memory-time').textContent = text;
      el('memory-time').setAttribute('aria-label', 'Tiempo: ' + text);
    }, 250);
  }

  function updateMemoryHud() {
    const moves = session.memoryMoves;
    el('memory-moves').textContent = moves + (moves === 1 ? ' mov' : ' movs');
    el('memory-moves').setAttribute('aria-label',
      moves + (moves === 1 ? ' movimiento' : ' movimientos'));
    el('memory-found').textContent = session.memoryMatched + ' / ' + session.memorySize + ' parejas';
    el('memory-found').setAttribute('aria-label',
      session.memoryMatched + ' de ' + session.memorySize + ' parejas');
  }

  function updateMemoryBestLabel() {
    const best = memoryBest[memoryKey()];
    el('memory-best').textContent = best ? 'Récord: ' + best.moves + ' movimientos' : 'Sin récord';
  }

  function memoryCardLabel(card) {
    return card.type === 'glyph' ? card.letter.name : card.label;
  }

  function memoryCardNode(index) {
    return el('memory-board').querySelector('[data-index="' + index + '"]');
  }

  function paintMemoryCard(index) {
    const card = session.memoryCards[index];
    const node = memoryCardNode(index);
    if (!card || !node) return;

    const up = card.flipped || card.matched;
    node.classList.toggle('is-flipped', up);
    node.classList.toggle('is-matched', card.matched);
    node.setAttribute('aria-pressed', String(up));

    let label = 'Carta ' + (index + 1) + ', ';
    if (card.matched) label += memoryCardLabel(card) + ', pareja encontrada';
    else if (up) label += memoryCardLabel(card);
    else label += 'boca abajo';
    node.setAttribute('aria-label', label);
  }

  function buildMemoryCards(size, kind) {
    const letters = pick(HEBREW_LETTERS, size);
    const cards = [];
    letters.forEach((letter) => {
      cards.push({
        pair: letter.char,
        type: 'glyph',
        letter,
        label: letter.name,
        flipped: false,
        matched: false
      });
      cards.push({
        pair: letter.char,
        type: 'label',
        letter,
        label: kind === 'value' ? String(letter.value) : letter.name,
        flipped: false,
        matched: false
      });
    });
    return shuffle(cards);
  }

  function buildMemoryChips(wrap, items, selected, onSelect) {
    if (!wrap.children.length) {
      items.forEach((item) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'chip';
        b.textContent = item.label;
        b.dataset.value = String(item.value);
        b.addEventListener('click', () => {
          if (String(selected()) === String(item.value)) return;
          onSelect(item.value);
        });
        wrap.appendChild(b);
      });
    }
    [...wrap.children].forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.value === String(selected())));
    });
  }

  function renderMemoryControls() {
    buildMemoryChips(el('memory-sizes'), [
      { value: 4, label: '4 parejas' },
      { value: 6, label: '6 parejas' }
    ], () => session.memorySize, (value) => {
      session.memorySize = value;
      Chiptune.sfx('click');
      startMemory();
    });

    buildMemoryChips(el('memory-kinds'), [
      { value: 'name', label: 'Nombre' },
      { value: 'value', label: 'Valor' }
    ], () => session.memoryKind, (value) => {
      session.memoryKind = value;
      Chiptune.sfx('click');
      startMemory();
    });
  }

  function renderMemoryBoard() {
    const board = el('memory-board');
    board.innerHTML = '';
    board.dataset.size = String(session.memorySize);
    board.setAttribute('aria-label', 'Cartas boca abajo: ' + session.memorySize + ' parejas');

    session.memoryCards.forEach((card, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'memcard';
      button.dataset.index = String(index);
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-label', 'Carta ' + (index + 1) + ', boca abajo');

      const inner = document.createElement('span');
      inner.className = 'memcard__inner';

      const front = document.createElement('span');
      front.className = 'memcard__face memcard__face--front';
      front.setAttribute('aria-hidden', 'true');
      front.textContent = '✦';

      const back = document.createElement('span');
      back.className = 'memcard__face memcard__face--back';
      back.setAttribute('aria-hidden', 'true');

      if (card.type === 'glyph') {
        const glyph = document.createElement('span');
        glyph.className = 'memcard__glyph';
        glyph.lang = 'he';
        glyph.dir = 'rtl';
        glyph.textContent = card.letter.char;
        back.appendChild(glyph);
      } else {
        const label = document.createElement('span');
        label.className = 'memcard__label' +
          (session.memoryKind === 'value' ? ' memcard__label--value' : '');
        label.textContent = card.label;
        back.appendChild(label);
      }

      inner.appendChild(front);
      inner.appendChild(back);
      button.appendChild(inner);
      button.addEventListener('click', () => flipMemoryCard(index));
      board.appendChild(button);
    });
  }

  function startMemory() {
    stopMemoryTimer();
    clearMemoryFlipTimer();

    if (session.memorySize !== 4 && session.memorySize !== 6) session.memorySize = 4;
    if (session.memoryKind !== 'name' && session.memoryKind !== 'value') session.memoryKind = 'name';

    session.memoryCards = buildMemoryCards(session.memorySize, session.memoryKind);
    session.memoryFlipped = [];
    session.memoryMatched = 0;
    session.memoryMoves = 0;
    session.memoryLocked = false;
    session.memoryWon = false;
    session.memoryStartedAt = 0;
    session.memoryElapsed = 0;
    session.memoryPausedAt = 0;

    renderMemoryControls();
    renderMemoryBoard();
    updateMemoryHud();
    updateMemoryBestLabel();

    el('memory-time').textContent = '0:00';
    el('memory-time').setAttribute('aria-label', 'Tiempo: 0:00');
    el('memory-status').textContent = 'Voltea dos cartas para empezar.';
    el('memory-win').hidden = true;
    el('memory-actions').hidden = false;
    el('memory-lead').textContent = 'Voltea dos cartas y encuentra el glifo y su ' +
      (session.memoryKind === 'value' ? 'valor' : 'nombre') + '.';

    Chiptune.startMusic('menu');
    showScreen('memory');
  }

  function flipMemoryCard(index) {
    if (session.memoryLocked || session.memoryWon) return;
    const card = session.memoryCards[index];
    if (!card || card.matched || card.flipped) return;
    if (session.memoryFlipped.length >= 2) return;

    card.flipped = true;
    session.memoryFlipped.push(index);
    paintMemoryCard(index);
    Chiptune.sfx('flip');

    if (!session.memoryStartedAt) {
      session.memoryStartedAt = Date.now();
      startMemoryTimer();
    }

    if (session.memoryFlipped.length === 1) {
      el('memory-status').textContent = 'Carta ' + (index + 1) + ': ' +
        memoryCardLabel(card) + '. Busca su pareja.';
      return;
    }

    const firstIndex = session.memoryFlipped[0];
    const first = session.memoryCards[firstIndex];
    session.memoryMoves++;
    updateMemoryHud();

    if (first.pair === card.pair) {
      first.matched = true;
      card.matched = true;
      paintMemoryCard(firstIndex);
      paintMemoryCard(index);
      session.memoryMatched++;
      session.memoryFlipped = [];
      updateMemoryHud();
      Chiptune.sfx('correct');
      el('memory-status').textContent = '¡Pareja! ' + first.letter.name + '.';
      if (session.memoryMatched === session.memorySize) finishMemory();
      return;
    }

    session.memoryLocked = true;
    Chiptune.sfx('wrong');
    el('memory-status').textContent = 'No coinciden: ' + memoryCardLabel(first) + ' y ' +
      memoryCardLabel(card) + '. Se vuelven a tapar.';
    session.memoryFlipTimer = setTimeout(() => {
      first.flipped = false;
      card.flipped = false;
      paintMemoryCard(firstIndex);
      paintMemoryCard(index);
      session.memoryFlipped = [];
      session.memoryLocked = false;
      session.memoryFlipTimer = null;
    }, 900);
  }

  function memoryStars(moves, pairs) {
    if (moves <= pairs + 1) return 3;
    if (moves <= Math.ceil(pairs * 1.75)) return 2;
    if (moves <= Math.ceil(pairs * 2.5)) return 1;
    return 0;
  }

  function finishMemory() {
    session.memoryWon = true;
    session.memoryLocked = true;
    stopMemoryTimer();

    const elapsed = session.memoryStartedAt ? Date.now() - session.memoryStartedAt : 0;
    session.memoryElapsed = elapsed;
    const time = formatMemoryTime(elapsed);
    el('memory-time').textContent = time;
    el('memory-time').setAttribute('aria-label', 'Tiempo: ' + time);

    const stars = memoryStars(session.memoryMoves, session.memorySize);
    el('memory-stars').textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
    el('memory-win-title').textContent = stars === 3 ? '¡Perfecto!' : '¡Completado!';
    el('memory-win-text').textContent = 'Has encontrado las ' + session.memorySize +
      ' parejas en ' + session.memoryMoves + ' movimientos y ' + time + '.';

    const key = memoryKey();
    const previous = memoryBest[key] || null;
    const seconds = Math.max(1, Math.round(elapsed / 1000));
    const isRecord = !previous || session.memoryMoves < previous.moves ||
      (session.memoryMoves === previous.moves && seconds < previous.seconds);

    if (isRecord) {
      memoryBest[key] = { moves: session.memoryMoves, seconds };
      store.set(MEMORY_KEY, memoryBest);
    }

    el('memory-win-best').textContent = isRecord
      ? '🏆 Nuevo récord: ' + session.memoryMoves + ' movimientos'
      : 'Récord: ' + previous.moves + ' movimientos';
    updateMemoryBestLabel();

    el('memory-status').textContent = '¡Completado! Has encontrado las ' + session.memorySize +
      ' parejas en ' + session.memoryMoves + ' movimientos y ' + time + '.';
    el('memory-board').setAttribute('aria-label', 'Todas las parejas encontradas');
    el('memory-actions').hidden = true;
    el('memory-win').hidden = false;

    Chiptune.startMusic('win');
    Chiptune.sfx('fanfare');
    setTimeout(() => {
      if (currentScreen === 'memory') {
        el('memory-win-title').focus({ preventScroll: true });
      }
    }, 120);
  }

  /* ---------------- Camino de letras ---------------- */
  function renderCampaign() {
    const stars = campaignStars();
    el('campaign-total').textContent = isCampaignComplete()
      ? '¡Completado! · ' + stars + ' / ' + CAMPAIGN_TOTAL_STARS + ' ★'
      : stars + ' / ' + CAMPAIGN_TOTAL_STARS + ' ★';

    const list = el('campaign-worlds');
    list.innerHTML = '';

    CAMPAIGN_LEVELS.forEach((level) => {
      const unlocked = level.id <= campaign.unlocked;
      const levelStars = Math.max(0, Math.min(3, Number(campaign.stars[level.id]) || 0));

      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'world' + (levelStars === 3 ? ' is-done' : '');
      button.dataset.level = String(level.id);
      button.disabled = !unlocked;
      button.setAttribute('aria-label',
        'Mundo ' + level.id + ': ' + level.title + '. ' +
        (unlocked ? levelStars + ' de 3 estrellas' : 'Bloqueado') + '. ' + level.subtitle);
      button.addEventListener('click', () => startCampaignLevel(level.id));

      const num = document.createElement('span');
      num.className = 'world__num';
      num.setAttribute('aria-hidden', 'true');
      num.textContent = level.id;

      const body = document.createElement('span');
      body.className = 'world__body';

      const title = document.createElement('span');
      title.className = 'world__title';
      title.textContent = level.title;

      const sub = document.createElement('span');
      sub.className = 'world__sub';
      sub.lang = 'he';
      sub.dir = 'rtl';
      sub.textContent = level.preview;

      const starRow = document.createElement('span');
      starRow.className = 'world__stars';
      starRow.setAttribute('aria-hidden', 'true');
      starRow.textContent = '★'.repeat(levelStars) + '☆'.repeat(3 - levelStars);

      const state = document.createElement('span');
      state.className = 'world__state';
      state.textContent = !unlocked ? 'Bloqueado' : levelStars > 0 ? 'Repetir' : 'Jugar';

      body.appendChild(title);
      body.appendChild(sub);
      body.appendChild(starRow);
      button.appendChild(num);
      button.appendChild(body);
      button.appendChild(state);
      item.appendChild(button);
      list.appendChild(item);
    });
  }

  function showCampaign() {
    Chiptune.startMusic('menu');
    showScreen('campaign');
  }

  function startCampaignLevel(id) {
    const level = CAMPAIGN_LEVELS.find((l) => l.id === id);
    if (!level || level.id > campaign.unlocked) return;

    session.campaignLevel = level.id;
    session.worldLetters = level.letters
      ? level.letters.map((ch) => HEBREW_LETTERS.find((l) => l.char === ch)).filter(Boolean)
      : null;
    session.mode = level.mode;
    session.quantity = level.quantity || (level.letters ? level.letters.length : 10);

    Chiptune.sfx('level');
    Chiptune.startMusic('menu');
    startStudy();
  }

  function updateCampaignProgress(stars) {
    if (!session.campaignLevel) return null;
    const level = CAMPAIGN_LEVELS.find((l) => l.id === session.campaignLevel);
    if (!level) return null;

    const previous = Number(campaign.stars[level.id]) || 0;
    if (stars > previous) campaign.stars[level.id] = stars;

    let message;
    if (stars < 1) {
      message = 'Necesitas al menos 1 estrella para abrir el siguiente mundo.';
    } else {
      const next = CAMPAIGN_LEVELS.find((l) => l.id === level.id + 1);
      if (next && campaign.unlocked === level.id) {
        campaign.unlocked = next.id;
        message = '🔓 Mundo ' + next.id + ' desbloqueado: ' + next.title + '.';
      } else if (isCampaignComplete()) {
        message = '🏆 ¡Camino completado! Has superado los ' + CAMPAIGN_LEVELS.length + ' mundos.';
      } else {
        message = 'Mundo superado. Repítelo para mejorar las estrellas.';
      }
    }

    store.set(CAMPAIGN_KEY, campaign);
    return message;
  }

  /* ---------------- Resultado ---------------- */
  function finishQuiz() {
    stopTimer();
    const seconds = Math.max(1, Math.round((Date.now() - session.startedAt) / 1000));
    const accuracy = session.questions.length
      ? Math.round((session.hits / session.questions.length) * 100)
      : 0;

    stats.games++;
    stats.correct += session.hits;
    stats.bestStreak = Math.max(stats.bestStreak, session.bestStreak);
    const modeLabel = (QUIZ_MODES.find((m) => m.id === session.mode) || {}).label || session.mode;
    const previousBest = stats.bestByMode[session.mode] || 0;
    const isBest = session.score > previousBest;
    if (isBest) stats.bestByMode[session.mode] = session.score;
    stats.best = Math.max(stats.best, session.score);
    store.set(STATS_KEY, stats);

    const stars = accuracy >= 90 ? 3 : accuracy >= 70 ? 2 : accuracy >= 50 ? 1 : 0;
    const campaignMessage = updateCampaignProgress(stars);
    const titles = {
      3: '¡Perfecto! Eres un maestro',
      2: '¡Muy bien! Casi perfecto',
      1: 'Vas por buen camino',
      0: 'Suerte la próxima vez'
    };

    el('result-stars').textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
    el('result-title').textContent = titles[stars];
    el('result-score').textContent = session.score;
    el('result-correct').textContent = session.hits + ' / ' + session.questions.length;
    el('result-accuracy').textContent = accuracy + ' %';
    el('result-time').textContent = seconds + ' s';
    el('result-streak').textContent = session.bestStreak;
    el('result-best').textContent = isBest
      ? '🏆 ¡Nuevo récord en ' + modeLabel + '!'
      : 'Mejor en ' + modeLabel + ': ' + previousBest + ' pts';
    el('result-unlock').hidden = !campaignMessage;
    el('result-unlock').textContent = campaignMessage || '';
    el('btn-campaign-result').hidden = !session.campaignLevel;
    el('btn-change').hidden = Boolean(session.campaignLevel);

    Chiptune.startMusic('win');
    Chiptune.sfx('fanfare');
    showScreen('result');
  }

  /* ---------------- Ajustes de audio ---------------- */
  function applyAudioSettings() {
    Chiptune.setMusicEnabled(settings.music);
    Chiptune.setSfxEnabled(settings.sfx);
    const mBtn = el('btn-music');
    const sBtn = el('btn-sfx');
    mBtn.setAttribute('aria-pressed', String(settings.music));
    mBtn.setAttribute('aria-label', settings.music ? 'Desactivar la música' : 'Activar la música');
    sBtn.setAttribute('aria-pressed', String(settings.sfx));
    sBtn.setAttribute('aria-label', settings.sfx ? 'Desactivar los efectos de sonido' : 'Activar los efectos de sonido');
  }

  /* ---------------- Eventos ---------------- */
  function bindEvents() {
    // El audio solo puede arrancar tras un gesto real del usuario
    const unlockAudio = () => Chiptune.unlock();
    document.addEventListener('pointerdown', unlockAudio);
    document.addEventListener('keydown', unlockAudio);

    // Al salir de la app: se pausa la música y el temporizador de la pregunta
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        session.hiddenAt = Date.now();
        if (session.qTimer) {
          clearInterval(session.qTimer);
          session.qTimer = null;
          session.timerPaused = true;
        }
        if (currentScreen === 'memory' && session.memoryStartedAt &&
            !session.memoryWon && !session.memoryPausedAt) {
          session.memoryPausedAt = Date.now();
          stopMemoryTimer();
        }
        Chiptune.suspend();
      } else {
        Chiptune.resume();
        if (session.timerPaused) {
          session.qStart += Date.now() - (session.hiddenAt || Date.now());
          session.hiddenAt = 0;
          startTimer(true);
        }
        if (session.memoryPausedAt) {
          session.memoryStartedAt += Date.now() - session.memoryPausedAt;
          session.memoryPausedAt = 0;
          if (!session.memoryWon) startMemoryTimer();
        }
      }
    });

    el('btn-music').addEventListener('click', () => {
      settings.music = !settings.music;
      store.set(SETTINGS_KEY, settings);
      applyAudioSettings();
      if (settings.music) Chiptune.startMusic('menu');
      toast(settings.music ? '♪ Música activada' : '♪ Música desactivada');
    });

    el('btn-sfx').addEventListener('click', () => {
      settings.sfx = !settings.sfx;
      store.set(SETTINGS_KEY, settings);
      applyAudioSettings();
      if (settings.sfx) Chiptune.sfx('click');
      toast(settings.sfx ? '🔊 Sonido activado' : '🔇 Sonido desactivado');
    });

    document.querySelector('[data-action="start-setup"]').addEventListener('click', () => {
      Chiptune.sfx('click');
      Chiptune.startMusic('menu');
      buildSetup();
      showScreen('setup');
    });

    document.querySelector('[data-action="show-campaign"]').addEventListener('click', () => {
      Chiptune.sfx('click');
      showCampaign();
    });

    document.querySelector('[data-action="show-review"]').addEventListener('click', () => {
      Chiptune.sfx('click');
      session.mode = 'review';
      buildSetup();
      showScreen('setup');
    });

    document.querySelector('[data-action="show-memory"]').addEventListener('click', () => {
      Chiptune.sfx('click');
      startMemory();
    });

    el('btn-memory-new').addEventListener('click', () => {
      Chiptune.sfx('click');
      startMemory();
    });
    el('btn-memory-again').addEventListener('click', () => {
      Chiptune.sfx('click');
      startMemory();
    });
    el('btn-memory-home').addEventListener('click', () => {
      Chiptune.sfx('click');
      Chiptune.startMusic('menu');
      showScreen('home');
    });
    el('btn-memory-win-home').addEventListener('click', () => {
      Chiptune.sfx('click');
      Chiptune.startMusic('menu');
      showScreen('home');
    });

    document.querySelector('[data-action="show-help"]').addEventListener('click', () => {
      Chiptune.sfx('click');
      showScreen('help');
    });

    el('btn-campaign-back').addEventListener('click', () => {
      Chiptune.sfx('click');
      showScreen('home');
    });

    el('btn-campaign-result').addEventListener('click', () => {
      Chiptune.sfx('click');
      showCampaign();
    });

    el('btn-help-back').addEventListener('click', () => {
      Chiptune.sfx('click');
      showScreen('home');
    });

    el('btn-study').addEventListener('click', () => {
      Chiptune.sfx('level');
      startStudy();
    });

    el('btn-skip-study').addEventListener('click', () => {
      Chiptune.sfx('click');
      startQuiz();
    });

    el('btn-study-flip').addEventListener('click', toggleStudyReveal);
    el('study-card').addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      if (currentScreen !== 'study') return;
      toggleStudyReveal();
    });
    el('btn-study-again').addEventListener('click', () => rateStudyCard('again'));
    el('btn-study-known').addEventListener('click', () => rateStudyCard('known'));

    el('btn-study-prev').addEventListener('click', () => moveStudy(-1));
    el('btn-study-next').addEventListener('click', () => moveStudy(1));
    el('btn-study-done').addEventListener('click', () => {
      Chiptune.sfx('click');
      startQuiz();
    });

    el('btn-hint').addEventListener('click', showHint);

    // Huecos de palabra: se puede volver a editar cualquiera de los dos
    [0, 1].forEach((i) => {
      el('slot-' + (i + 1)).addEventListener('click', () => {
        if (session.answeredCurrent) return;
        if (session.activeSlot === i) return;
        session.activeSlot = i;
        Chiptune.sfx('click');
        paintSlots();
        renderWordOptions();
      });
    });

    el('btn-quiz-next').addEventListener('click', nextQuestion);

    el('btn-replay').addEventListener('click', () => {
      Chiptune.sfx('click');
      startQuiz();
    });

    el('btn-change').addEventListener('click', () => {
      Chiptune.sfx('click');
      Chiptune.startMusic('menu');
      buildSetup();
      showScreen('setup');
    });

    el('btn-home').addEventListener('click', () => {
      Chiptune.sfx('click');
      Chiptune.startMusic('menu');
      showScreen('home');
    });

    // Teclado en el estudio: flechas para navegar, R para girar, 1/2 para marcar
    document.addEventListener('keydown', (e) => {
      if (currentScreen !== 'study') return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        moveStudy(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        moveStudy(1);
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        toggleStudyReveal();
      } else if (session.revealed && (e.key === '1' || e.key === '2')) {
        e.preventDefault();
        rateStudyCard(e.key === '1' ? 'again' : 'known');
      }
    });

    // Teclado: opciones 1-4, Enter para continuar
    document.addEventListener('keydown', (e) => {
      if (el('screen-quiz').hidden) return;
      if (session.answeredCurrent) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (!el('btn-quiz-next').hidden) nextQuestion();
        }
        return;
      }
      const idx = ['1', '2', '3', '4'].indexOf(e.key);
      if (idx !== -1) {
        const btn = el('quiz-options').children[idx];
        if (btn) btn.click();
      }
    });
  }

  /* ---------------- Arranque ---------------- */
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
    navigator.serviceWorker.register('sw.js').catch(() => { /* sin offline */ });
  }

  function initPlatform() {
    const web = location.protocol === 'http:' || location.protocol === 'https:';
    if (!web) return; // en file:// (APK) todo va empaquetado y no hay CSP que aplicar

    // Manifiesto: solo tiene sentido para instalar la PWA
    const manifest = document.createElement('link');
    manifest.rel = 'manifest';
    manifest.href = 'manifest.webmanifest';
    document.head.appendChild(manifest);

    // Política de contenido: bloquea scripts y recursos de terceros
    const csp = document.createElement('meta');
    csp.httpEquiv = 'Content-Security-Policy';
    csp.content = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
                   "img-src 'self' data:; media-src 'self'; connect-src 'self'; " +
                   "worker-src 'self'; base-uri 'none'; form-action 'none'";
    document.head.appendChild(csp);
  }

  // Envoltorio Android: el botón físico "atrás" vuelve a la pantalla anterior
  window.alefBack = () => {
    const back = {
      setup: 'home', campaign: 'home', memory: 'home', study: 'setup',
      quiz: 'setup', result: 'home', help: 'home', home: 'home'
    };
    if (session.campaignLevel &&
        (currentScreen === 'study' || currentScreen === 'quiz' || currentScreen === 'result')) {
      back[currentScreen] = 'campaign';
    }
    const target = back[currentScreen] || 'home';
    if (target === currentScreen) return false;
    if (currentScreen === 'quiz') stopTimer();
    Chiptune.startMusic(target === 'quiz' ? 'quiz' : 'menu');
    showScreen(target);
    return true;
  };

  // API de introspección (la usan las pruebas automáticas)
  window.alefState = () => ({
    mode: session.mode,
    quantity: session.quantity,
    screen: currentScreen,
    score: session.score,
    hintUsed: session.hintUsed,
    campaignLevel: session.campaignLevel,
    pendingReview: pendingReviewCount(),
    memory: {
      size: session.memorySize,
      kind: session.memoryKind,
      moves: session.memoryMoves,
      matched: session.memoryMatched,
      won: session.memoryWon,
      cards: session.memoryCards.map((c) => ({
        pair: c.pair,
        type: c.type,
        label: c.label,
        matched: c.matched
      }))
    },
    question: session.questions[session.qIndex] || null
  });

  function init() {
    bindEvents();
    buildSetup();
    applyAudioSettings();
    initPlatform();
    showScreen('home');
    registerServiceWorker();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
