/* ============================================================
   data.js — Alfabeto hebreo: letras, nombres, valores y pistas
   Los nombres usan la transliteración estándar (Alef, Bet...).
   El "valor" es el valor gematría (numeración judía).
   ============================================================ */

const HEBREW_LETTERS = [
  { char: 'א', name: 'Alef',   value: 1,   say: 'silenciosa (o "a")', final: null, hint: 'La letra del buey' },
  { char: 'ב', name: 'Bet',    value: 2,   say: 'b / v (bet / vet)', final: null, hint: 'La letra de la casa' },
  { char: 'ג', name: 'Gimel',  value: 3,   say: 'g de gato', final: null, hint: 'La letra del camello' },
  { char: 'ד', name: 'Dalet',  value: 4,   say: 'd', final: null, hint: 'La letra de la puerta' },
  { char: 'ה', name: 'He',     value: 5,   say: 'h aspirada', final: null, hint: 'La letra de la ventana' },
  { char: 'ו', name: 'Vav',    value: 6,   say: 'v', final: null, hint: 'La letra del clavo' },
  { char: 'ז', name: 'Zayin',  value: 7,   say: 'z', final: null, hint: 'La letra de la espada' },
  { char: 'ח', name: 'Het',    value: 8,   say: 'j suave', final: null, hint: 'La letra de la cerca' },
  { char: 'ט', name: 'Tet',    value: 9,   say: 't', final: null, hint: 'La letra de la serpiente' },
  { char: 'י', name: 'Yod',    value: 10,  say: 'y / i', final: null, hint: 'La letra de la mano' },
  { char: 'כ', name: 'Kaf',    value: 20,  say: 'k / j suave (kaf / jaf)', final: 'ך', hint: 'La letra del puño' },
  { char: 'ל', name: 'Lamed',  value: 30,  say: 'l', final: null, hint: 'La letra del guía' },
  { char: 'מ', name: 'Mem',    value: 40,  say: 'm', final: 'ם', hint: 'La letra del agua' },
  { char: 'נ', name: 'Nun',    value: 50,  say: 'n', final: 'ן', hint: 'La letra de la semilla' },
  { char: 'ס', name: 'Samekh', value: 60,  say: 's', final: null, hint: 'La letra del apoyo' },
  { char: 'ע', name: 'Ayin',   value: 70,  say: 'silenciosa (gutural)', final: null, hint: 'La letra del ojo' },
  { char: 'פ', name: 'Pe',     value: 80,  say: 'p / f (pe / fei)', final: 'ף', hint: 'La letra de la boca' },
  { char: 'צ', name: 'Tsadi',  value: 90,  say: 'tz', final: 'ץ', hint: 'La letra del anzuelo' },
  { char: 'ק', name: 'Qof',    value: 100, say: 'q / k', final: null, hint: 'La letra de la nuca' },
  { char: 'ר', name: 'Resh',   value: 200, say: 'r suave', final: null, hint: 'La letra de la cabeza' },
  { char: 'ש', name: 'Shin',   value: 300, say: 'sh / s (shin / sin)', final: null, hint: 'La letra del diente' },
  { char: 'ת', name: 'Tav',    value: 400, say: 't', final: null, hint: 'La letra de la marca' }
];

/* Tamaños de letra ofrecidos en la pantalla de preparación */
const QUANTITY_CHOICES = [5, 8, 10, 12, 15, 20, 22];

/* Palabras de dos letras para la modalidad de escritura.
   "letters" va en orden lógico: la primera letra se escribe a la derecha. */
const HEBREW_WORDS = [
  { word: 'אב', letters: ['א', 'ב'], translit: 'av',   meaning: 'padre' },
  { word: 'אם', letters: ['א', 'ם'], translit: 'em',   meaning: 'madre',        note: 'La ם es la forma final de מ' },
  { word: 'בן', letters: ['ב', 'ן'], translit: 'ben',  meaning: 'hijo',         note: 'La ן es la forma final de נ' },
  { word: 'בת', letters: ['ב', 'ת'], translit: 'bat',  meaning: 'hija' },
  { word: 'יד', letters: ['י', 'ד'], translit: 'yad',  meaning: 'mano' },
  { word: 'ים', letters: ['י', 'ם'], translit: 'yam',  meaning: 'mar',          note: 'La ם es la forma final de מ' },
  { word: 'עץ', letters: ['ע', 'ץ'], translit: 'etz',  meaning: 'árbol',       note: 'La ץ es la forma final de צ' },
  { word: 'שם', letters: ['ש', 'ם'], translit: 'shem', meaning: 'nombre',       note: 'La ם es la forma final de מ' },
  { word: 'הר', letters: ['ה', 'ר'], translit: 'har',  meaning: 'montaña' },
  { word: 'עם', letters: ['ע', 'ם'], translit: 'am',   meaning: 'pueblo, nación', note: 'La ם es la forma final de מ' }
];

/* Cuántas palabras se practican en una ronda */
const WORD_QUANTITY_CHOICES = [4, 6, 8, 10];

/* Letras que nunca cambian de forma y formas finales (לפני מילה) */
const PLAIN_CHARS = HEBREW_LETTERS.filter((l) => !l.final).map((l) => l.char);
const FINAL_CHARS = HEBREW_LETTERS.filter((l) => l.final).map((l) => l.final);

/* Parejas letra normal ↔ forma final (כ/ך, מ/ם, נ/ן, פ/ף, צ/ץ) */
const FINAL_PAIRS = HEBREW_LETTERS
  .filter((l) => l.final)
  .map((l) => ({ base: l.char, final: l.final, name: l.name, hint: l.hint }));

/* Preguntas del modo Finales: 5 (una por pareja) o 10 (ida y vuelta) */
const SOFIT_QUANTITY_CHOICES = [5, 10];

/* Preguntas del modo V/F: 10 o 16 fichas */
const VF_QUANTITY_CHOICES = [10, 16];

/* Letras por ronda del repaso inteligente */
const REVIEW_QUANTITY_CHOICES = [10, 16];

/* Preguntas del modo Orden alfabético */
const ORDER_QUANTITY_CHOICES = [10, 16];

/* Formatos de Palabras: escribir la palabra o leerla a partir del significado */
const WORD_DIRECTIONS = [
  { id: 'write', label: 'Escribir' },
  { id: 'read', label: 'Leer' }
];

/* Modos de examen */
const QUIZ_MODES = [
  { id: 'name',      label: 'Nombre',   desc: 'Ver la letra y elegir su nombre' },
  { id: 'value',     label: 'Valor',    desc: 'Ver la letra y elegir su número' },
  { id: 'glyph',     label: 'Letra',    desc: 'Ver el nombre y elegir la letra hebrea' },
  { id: 'order',     label: 'Orden',    desc: 'Elegir la letra que va antes o después en el alfabeto' },
  { id: 'sofit',     label: 'Finales',  desc: 'Ver una letra y elegir su forma final (o al revés)' },
  { id: 'truefalse', label: 'V/F',      desc: 'Decidir si la ficha de una letra es verdadera o falsa' },
  { id: 'words',     label: 'Palabras', desc: 'Escribir o leer palabras de dos letras hebreas' },
  { id: 'mix',       label: 'Mixto',    desc: 'Alterna entre nombre, valor y letra' },
  { id: 'review',    label: 'Repaso',   desc: 'Prioriza las letras que fallas o llevan tiempo sin salir' }
];

/* Camino de letras: cada mundo se desbloquea con al menos 1 estrella.
   Los cuatro primeros usan "mix" sobre un bloque del alfabeto; el quinto
   es la modalidad Finales y el sexto, Palabras. */
const CAMPAIGN_LEVELS = [
  {
    id: 1, title: 'Alef – Vav', subtitle: 'Seis letras',
    letters: ['א', 'ב', 'ג', 'ד', 'ה', 'ו'], mode: 'mix',
    preview: 'א ב ג ד ה ו'
  },
  {
    id: 2, title: 'Zayin – Lamed', subtitle: 'Seis letras',
    letters: ['ז', 'ח', 'ט', 'י', 'כ', 'ל'], mode: 'mix',
    preview: 'ז ח ט י כ ל'
  },
  {
    id: 3, title: 'Mem – Pe', subtitle: 'Cinco letras',
    letters: ['מ', 'נ', 'ס', 'ע', 'פ'], mode: 'mix',
    preview: 'מ נ ס ע פ'
  },
  {
    id: 4, title: 'Tsadi – Tav', subtitle: 'Cinco letras',
    letters: ['צ', 'ק', 'ר', 'ש', 'ת'], mode: 'mix',
    preview: 'צ ק ר ש ת'
  },
  {
    id: 5, title: 'Formas finales', subtitle: 'Cinco parejas',
    mode: 'sofit', quantity: 10, preview: 'כ ך · מ ם · נ ן · פ ף · צ ץ'
  },
  {
    id: 6, title: 'Palabras', subtitle: 'Diez palabras de dos letras',
    mode: 'words', quantity: 10, wordDirection: 'write',
    preview: 'אב · אם · בן · בת · יד · ים…'
  }
];

const CAMPAIGN_TOTAL_STARS = CAMPAIGN_LEVELS.length * 3;
