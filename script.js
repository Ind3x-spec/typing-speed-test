'use strict';

const WORD_BANK_EASY = [
  "the", "be", "to", "of", "and", "a", "in", "it", "for", "on",
  "he", "as", "you", "do", "at", "this", "his", "by", "she", "or",
  "my", "one", "all", "what", "up", "out", "who", "get", "go", "me",
  "can", "like", "time", "no", "him", "know", "year", "your", "good",
  "see", "now", "look", "come", "back", "use", "two", "how", "way",
  "new", "want", "day", "us", "hand", "high", "hold", "turn", "live",
  "soon", "real", "life", "open", "next", "white", "got", "walk",
  "book", "mile", "car", "feet", "care", "girl", "ever", "red", "list", 
  "feel", "talk", "bird", "body", "dog", "song", "door", "black",
  "wind", "ship", "rock", "fire", "king", "city", "play", "off", "try"
];

const WORD_BANK_MEDIUM = [
  "that", "have", "not", "with", "from", "they", "we", "say", "her",
  "will", "would", "there", "their", "about", "which", "when", "make",
  "just", "take", "people", "into", "some", "could", "other", "than",
  "then", "only", "over", "think", "also", "after", "our", "work",
  "first", "well", "even", "because", "these", "give", "most", "great",
  "between", "need", "large", "often", "place", "move", "night", "few",
  "north", "seem", "together", "begin", "example", "ease", "paper",
  "group", "always", "music", "those", "mark", "letter", "until",
  "river", "second", "enough", "plain", "usual", "young", "ready",
  "above", "though", "family", "direct", "leave", "measure", "product",
  "short", "class", "question", "happen", "complete", "area", "half",
  "order", "south", "problem", "piece", "told", "knew", "pass", "since",
  "whole", "point", "small", "number", "always", "show", "plant"
];

const WORD_BANK_HARD = [
  "between", "because", "example", "together", "children", "complete",
  "question", "happen", "problem", "numeral", "measure", "product",
  "direct", "usual", "though", "enough", "letter", "different",
  "important", "available", "necessary", "experience", "particular",
  "government", "development", "understand", "characteristic",
  "organization", "relationship", "environment", "communication",
  "responsibility", "opportunity", "significant", "consequently",
  "approximately", "establishment", "circumstances", "professional",
  "international", "fundamental", "demonstrate", "appropriate",
  "implementation", "comprehensive", "infrastructure", "philosophical",
  "extraordinary", "sophisticated", "controversial", "phenomenon"
];

const DIFFICULTY_BANKS = { easy: WORD_BANK_EASY, medium: WORD_BANK_MEDIUM, hard: WORD_BANK_HARD };
let currentDifficulty = 'medium';

const wordsDisplay    = document.getElementById('wordsDisplay');
const inputField      = document.getElementById('inputField');
const inputHint       = document.getElementById('inputHint');
const wpmEl           = document.getElementById('wpm');
const accuracyEl      = document.getElementById('accuracy');
const timerEl         = document.getElementById('timer');
const errorsEl        = document.getElementById('errors');
const progressBar     = document.getElementById('progressBar');
const resetBtn        = document.getElementById('resetBtn');
const retryBtn        = document.getElementById('retryBtn');
const resultsOverlay  = document.getElementById('resultsOverlay');
const finalWpm        = document.getElementById('finalWpm');
const finalAccuracy   = document.getElementById('finalAccuracy');
const finalRaw        = document.getElementById('finalRaw');
const finalChars      = document.getElementById('finalChars');
const finalConsistency = document.getElementById('finalConsistency');
const finalTime       = document.getElementById('finalTime');
const finalTestType   = document.getElementById('finalTestType');
const modeBtns        = document.querySelectorAll('.mode-btn');
const presetBtns      = document.querySelectorAll('.mode-btn[data-time]'); // excludes Set button — fixes double-handler bug
const diffBtns        = document.querySelectorAll('.diff-btn');
const typingContainer = document.getElementById('typingContainer');
const customTimeInput = document.getElementById('customTimeInput');
const customTimeBtn   = document.getElementById('customTimeBtn');

let words = [], wordEls = [], currentWord = 0, correctWords = 0, totalErrors = 0, totalTyped = 0;
let timerDuration = 60, timeLeft = 60, timerInterval = null, started = false, finished = false;
let wpmHistory = [], correctChars = 0, incorrectChars = 0, extraChars = 0, missedChars = 0, totalCharsTyped = 0;
let typedHistory = []; // typed string per finalized word index — enables backspacing into previous word

function pickWords(count) {
  const bank = DIFFICULTY_BANKS[currentDifficulty];
  const arr = [];
  for (let i = 0; i < count; i++) arr.push(bank[Math.floor(Math.random() * bank.length)]);
  return arr;
}

function buildDisplay() {
  wordsDisplay.innerHTML = '';
  wordEls = [];
  words.forEach((word) => {
    const wordDiv = document.createElement('div');
    wordDiv.classList.add('word');
    word.split('').forEach(ch => {
      const span = document.createElement('span');
      span.textContent = ch;
      wordDiv.appendChild(span);
    });
    wordsDisplay.appendChild(wordDiv);
    wordEls.push(wordDiv);
  });
  if (wordEls.length > 0) wordEls[0].classList.add('active');
}

function renderCurrentWord(typed) {
  const wordDiv = wordEls[currentWord];
  if (!wordDiv) return;

  // clear extras from prior render; querying after gives just the target-length letter spans
  wordDiv.querySelectorAll('span.extra').forEach(s => s.remove());
  const letters = wordDiv.querySelectorAll('span');
  const target  = words[currentWord];

  letters.forEach((span, i) => {
    span.className = '';
    if (i < typed.length) span.classList.add(typed[i] === target[i] ? 'correct' : 'wrong');
  });

  // live-render overtyped characters beyond word length
  if (typed.length > target.length) {
    typed.slice(target.length).split('').forEach(ch => {
      const span = document.createElement('span');
      span.textContent = ch;
      span.classList.add('extra', 'wrong');
      wordDiv.appendChild(span);
    });
  }

  // cursor sits before the next letter to type, or after the true end (incl. any overtyped chars)
  if (typed.length < letters.length) {
    letters[typed.length].classList.add('cursor');
  } else {
    const allSpans = wordDiv.querySelectorAll('span');
    allSpans[allSpans.length - 1].classList.add('cursor-end');
  }
}

// Pure stat delta for a typed/target pair — shared by finalize (add) and
// unfinalize (subtract) so the two stay mathematically in sync.
function computeWordDelta(typed, target) {
  let correct = 0, incorrect = 0, missed = 0, extra = 0;
  for (let i = 0; i < target.length; i++) {
    if (i < typed.length) { if (typed[i] === target[i]) correct++; else incorrect++; }
    else missed++;
  }
  if (typed.length > target.length) extra = typed.length - target.length;
  return { correct, incorrect, missed, extra, wasCorrect: typed === target };
}

function finalizeWord(typed) {
  const wordDiv = wordEls[currentWord];
  const target  = words[currentWord];

  wordDiv.querySelectorAll('span.extra').forEach(s => s.remove());
  const letters = wordDiv.querySelectorAll('span');

  const delta = computeWordDelta(typed, target);
  correctChars   += delta.correct;
  incorrectChars += delta.incorrect;
  missedChars    += delta.missed;
  extraChars     += delta.extra;

  letters.forEach((span, i) => {
    span.className = '';
    if (i < typed.length) span.classList.add(typed[i] === target[i] ? 'correct' : 'wrong');
    else span.classList.add('wrong');
  });

  if (delta.extra > 0) {
    typed.slice(target.length).split('').forEach(ch => {
      const span = document.createElement('span');
      span.textContent = ch;
      span.classList.add('extra', 'wrong');
      wordDiv.appendChild(span);
    });
  }

  totalCharsTyped += typed.length + 1;
  typedHistory[currentWord] = typed;

  if (delta.wasCorrect) { correctWords++; wordDiv.classList.add('done-correct'); }
  else { totalErrors++; wordDiv.classList.add('done-wrong'); }

  wordDiv.classList.remove('active');
}

// Reverses finalizeWord for the given index so the word can be retyped.
// Returns the previously typed string, or null if that word was never finalized.
function unfinalizeWord(index) {
  const wordDiv = wordEls[index];
  const target  = words[index];
  const typed   = typedHistory[index];
  if (typed === undefined) return null;

  const delta = computeWordDelta(typed, target);
  correctChars    -= delta.correct;
  incorrectChars  -= delta.incorrect;
  missedChars     -= delta.missed;
  extraChars      -= delta.extra;
  totalCharsTyped -= (typed.length + 1);

  if (delta.wasCorrect) { correctWords--; wordDiv.classList.remove('done-correct'); }
  else { totalErrors--; wordDiv.classList.remove('done-wrong'); }

  typedHistory[index] = undefined;
  return typed;
}

function scrollToActive() {
  const activeEl = wordEls[currentWord];
  if (!activeEl) return;
  const containerTop = wordsDisplay.offsetTop;
  const wordTop      = activeEl.offsetTop;
  wordsDisplay.scrollTop = wordTop - containerTop;
}

function calcWpm() {
  const elapsed = (timerDuration - timeLeft) / 60;
  if (elapsed === 0) return 0;
  return Math.round(correctWords / elapsed);
}

function calcRawWpm() {
  const elapsed = (timerDuration - timeLeft) / 60;
  if (elapsed === 0) return 0;
  return Math.round((totalCharsTyped / 5) / elapsed);
}

function calcAccuracy() {
  const total = correctChars + incorrectChars;
  if (total === 0) return 100;
  return Math.round((correctChars / total) * 100);
}

function calcConsistency() {
  if (wpmHistory.length < 2) return 100;
  const vals = wpmHistory.map(h => h.wpm);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  if (mean === 0) return 100;
  const variance = vals.reduce((a, b) => a + (b - mean) * (b - mean), 0) / vals.length;
  const stdDev = Math.sqrt(variance);
  return Math.max(0, Math.min(100, Math.round(100 - (stdDev / mean) * 100)));
}

function updateStats() {
  wpmEl.textContent       = calcWpm();
  accuracyEl.textContent  = calcAccuracy();
  timerEl.textContent     = timeLeft;
  errorsEl.textContent    = totalErrors;
  progressBar.style.width = (timeLeft / timerDuration * 100) + '%';
}

function drawChart() {
  const svg = document.getElementById('wpmChart');
  if (!svg) return;
  svg.innerHTML = '';
  const W = 600, H = 220, padL = 36, padR = 10, padT = 14, padB = 24;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const data = wpmHistory.length > 0 ? wpmHistory : [{ sec: 1, wpm: 0, raw: 0 }];
  const maxVal = Math.max(10, ...data.map(d => Math.max(d.wpm, d.raw))) * 1.15;
  const n = data.length;
  const xFor = (i) => padL + (n <= 1 ? 0 : (i / (n - 1)) * plotW);
  const yFor = (v) => padT + plotH - (v / maxVal) * plotH;
  const ns = 'http://www.w3.org/2000/svg';
  const make = (tag, attrs) => {
    const el = document.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  };
  const gridSteps = 4;
  for (let i = 0; i <= gridSteps; i++) {
    const v = (maxVal / gridSteps) * i, y = yFor(v);
    svg.appendChild(make('line', { x1: padL, x2: W - padR, y1: y, y2: y, stroke: 'var(--border)', 'stroke-opacity': '0.15', 'stroke-width': '1' }));
    const label = make('text', { x: padL - 6, y: y + 4, 'text-anchor': 'end', 'font-size': '10', fill: 'var(--muted)', 'font-family': 'var(--font-mono)' });
    label.textContent = Math.round(v);
    svg.appendChild(label);
  }
  function pathFor(key) {
    return data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(d[key])}`).join(' ');
  }
  svg.appendChild(make('path', { d: pathFor('raw'), fill: 'none', stroke: 'var(--muted)', 'stroke-width': '2', opacity: '0.7' }));
  svg.appendChild(make('path', { d: pathFor('wpm'), fill: 'none', stroke: 'var(--accent2)', 'stroke-width': '3' }));
  data.forEach((d, i) => svg.appendChild(make('circle', { cx: xFor(i), cy: yFor(d.wpm), r: '3', fill: 'var(--accent2)' })));
  const labelEvery = Math.max(1, Math.ceil(n / 10));
  data.forEach((d, i) => {
    if (i % labelEvery !== 0 && i !== n - 1) return;
    const label = make('text', { x: xFor(i), y: H - 6, 'text-anchor': 'middle', 'font-size': '10', fill: 'var(--muted)', 'font-family': 'var(--font-mono)' });
    label.textContent = d.sec;
    svg.appendChild(label);
  });
}

function startTimer() {
  timerInterval = setInterval(() => {
    timeLeft--;
    updateStats();
    wpmHistory.push({ sec: timerDuration - timeLeft, wpm: calcWpm(), raw: calcRawWpm() });
    if (timeLeft <= 0) endTest();
  }, 1000);
}

function endTest() {
  clearInterval(timerInterval);
  finished = true;
  inputField.blur();

  const wpm = calcWpm(), raw = calcRawWpm(), acc = calcAccuracy(), consistency = calcConsistency();

  finalWpm.textContent      = wpm;
  finalAccuracy.textContent = acc + '%';
  finalRaw.textContent      = raw;
  finalChars.textContent    = `${correctChars}/${incorrectChars}/${extraChars}/${missedChars}`;
  finalConsistency.textContent = consistency + '%';
  finalTime.textContent     = timerDuration + 's';
  finalTestType.innerHTML   = `time ${timerDuration}<br>${currentDifficulty}`;

  drawChart();
  resultsOverlay.classList.remove('hidden');
}

function resetTest() {
  clearInterval(timerInterval);
  timerInterval = null;
  started = false; finished = false; timeLeft = timerDuration;
  currentWord = 0; correctWords = 0; totalErrors = 0; totalTyped = 0;
  wpmHistory = []; correctChars = 0; incorrectChars = 0; extraChars = 0; missedChars = 0; totalCharsTyped = 0;
  typedHistory = [];

  progressBar.style.transition = 'none';
  progressBar.style.width = '100%';
  setTimeout(() => { progressBar.style.transition = 'width 1s linear'; }, 50);

  words = pickWords(150);
  buildDisplay();
  updateStats();
  timerEl.textContent = timeLeft;

  inputField.value = '';
  inputField.disabled = false;
  inputHint.classList.remove('hidden');
  resultsOverlay.classList.add('hidden');
}

// ── Typing: render current word coloring (does NOT advance) ────────────────
inputField.addEventListener('input', () => {
  if (finished) return;
  const typed = inputField.value;
  if (!started && typed.trim().length > 0) {
    started = true;
    inputHint.classList.add('hidden');
    startTimer();
  }
  renderCurrentWord(typed);
  updateStats();
});

// ── Advance word on Enter OR Space ──────────────────────────────────────────
function advanceWord() {
  if (finished) return;

  const typed = inputField.value.trim();

  if (!started && typed.length > 0) {
    started = true;
    inputHint.classList.add('hidden');
    startTimer();
  }

  finalizeWord(typed);
  currentWord++;

  if (currentWord >= words.length) {
    const more = pickWords(50);
    words = words.concat(more);
    more.forEach((w) => {
      const wordDiv = document.createElement('div');
      wordDiv.classList.add('word');
      w.split('').forEach(ch => {
        const span = document.createElement('span');
        span.textContent = ch;
        wordDiv.appendChild(span);
      });
      wordsDisplay.appendChild(wordDiv);
      wordEls.push(wordDiv);
    });
  }

  if (wordEls[currentWord]) {
    wordEls[currentWord].classList.add('active');
    scrollToActive();
  }

  inputField.value = '';
  updateStats();
}

inputField.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    resetTest();
    return;
  }

  if (e.key === 'Backspace' && inputField.value.length === 0 && currentWord > 0) {
    e.preventDefault();
    const prevIndex = currentWord - 1;
    const prevTyped = unfinalizeWord(prevIndex);
    if (prevTyped !== null) {
      wordEls[currentWord].classList.remove('active');
      currentWord = prevIndex;
      wordEls[currentWord].classList.add('active');
      inputField.value = prevTyped;
      renderCurrentWord(prevTyped);
      updateStats();
      scrollToActive();
    }
    return;
  }

  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    // ignore a space/enter press before any letters are typed for this word
    if (inputField.value.trim().length === 0) return;
    advanceWord();
  }
});

function focusInput() {
  if (!finished) {
    inputField.focus();
    inputHint.classList.add('hidden');
  }
}

typingContainer.addEventListener('click', focusInput);

document.addEventListener('keydown', (e) => {
  if (finished) return;
  if (e.key === 'Tab') return;
  if (document.activeElement !== inputField && document.activeElement !== customTimeInput) {
    // Enter (or any key) when not focused just starts/focuses — does not finalize a word
    inputField.focus();
    inputHint.classList.add('hidden');
    if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
  }
});

inputField.addEventListener('blur', () => {
  if (!started && !finished) inputHint.classList.remove('hidden');
  typingContainer.classList.remove('is-focused');
});

inputField.addEventListener('focus', () => {
  typingContainer.classList.add('is-focused');
});

presetBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    modeBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    timerDuration = parseInt(btn.dataset.time, 10);
    if (customTimeInput) customTimeInput.value = '';
    resetTest();
  });
});

if (customTimeBtn) {
  customTimeBtn.addEventListener('click', () => {
    const val = parseInt(customTimeInput.value, 10);
    if (!val || val <= 0) return;
    timerDuration = Math.min(Math.max(val, 5), 3600);
    modeBtns.forEach(b => b.classList.remove('active'));
    customTimeBtn.classList.add('active');
    customTimeInput.value = timerDuration;
    resetTest();
  });
}

if (customTimeInput) {
  customTimeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      customTimeBtn.click();
    }
  });
}

diffBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    diffBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentDifficulty = btn.dataset.difficulty;
    resetTest();
  });
});

resetBtn.addEventListener('click', resetTest);
retryBtn.addEventListener('click', resetTest);

// ---------- FINGER GUIDE PANEL ----------
const FINGER_GUIDE = [
  { id: 'L-pinky',  hand: 'left',   label: 'pinky',  color: 'var(--f-lp)' },
  { id: 'L-ring',   hand: 'left',   label: 'ring',   color: 'var(--f-lr)' },
  { id: 'L-middle', hand: 'left',   label: 'middle', color: 'var(--f-lm)' },
  { id: 'L-index',  hand: 'left',   label: 'index',  color: 'var(--f-li)' },
  { id: 'thumb',    hand: 'thumbs', label: 'thumbs', color: 'var(--f-th)' },
  { id: 'R-index',  hand: 'right',  label: 'index',  color: 'var(--f-ri)' },
  { id: 'R-middle', hand: 'right',  label: 'middle', color: 'var(--f-rm)' },
  { id: 'R-ring',   hand: 'right',  label: 'ring',   color: 'var(--f-rr)' },
  { id: 'R-pinky',  hand: 'right',  label: 'pinky',  color: 'var(--f-rp)' },
];

const FINGER_GUIDE_ROWS = [
  [ {l:'`',f:'L-pinky'},{l:'1',f:'L-pinky'},{l:'2',f:'L-ring'},{l:'3',f:'L-middle'},
    {l:'4',f:'L-index'},{l:'5',f:'L-index'},{l:'6',f:'R-index'},{l:'7',f:'R-index'},
    {l:'8',f:'R-middle'},{l:'9',f:'R-ring'},{l:'0',f:'R-pinky'},{l:'-',f:'R-pinky'},
    {l:'=',f:'R-pinky'},{l:'⌫',f:'R-pinky',w:1.7} ],

  [ {l:'Tab',f:'L-pinky',w:1.5},{l:'Q',f:'L-pinky'},{l:'W',f:'L-ring'},{l:'E',f:'L-middle'},
    {l:'R',f:'L-index'},{l:'T',f:'L-index'},{l:'Y',f:'R-index'},{l:'U',f:'R-index'},
    {l:'I',f:'R-middle'},{l:'O',f:'R-ring'},{l:'P',f:'R-pinky'},{l:'[',f:'R-pinky'},
    {l:']',f:'R-pinky'},{l:'\\',f:'R-pinky',w:1.3} ],

  [ {l:'Caps',f:'L-pinky',w:1.75},{l:'A',f:'L-pinky'},{l:'S',f:'L-ring'},{l:'D',f:'L-middle'},
    {l:'F',f:'L-index',bump:true},{l:'G',f:'L-index'},{l:'H',f:'R-index'},{l:'J',f:'R-index',bump:true},
    {l:'K',f:'R-middle'},{l:'L',f:'R-ring'},{l:';',f:'R-pinky'},{l:"'",f:'R-pinky'},
    {l:'Enter',f:'R-pinky',w:2.1} ],

  [ {l:'Shift',f:'L-pinky',w:2.2},{l:'Z',f:'L-pinky'},{l:'X',f:'L-ring'},{l:'C',f:'L-middle'},
    {l:'V',f:'L-index'},{l:'B',f:'L-index'},{l:'N',f:'R-index'},{l:'M',f:'R-index'},
    {l:',',f:'R-middle'},{l:'.',f:'R-ring'},{l:'/',f:'R-pinky'},{l:'Shift',f:'R-pinky',w:2.6} ],
];

function initFingerGuide() {
  const board = document.getElementById('fgBoard');
  const hands = document.getElementById('fgHands');
  if (!board || !hands) return;

  const FG_KEY_UNIT = 38;
  const colorFor = id => FINGER_GUIDE.find(f => f.id === id).color;

  FINGER_GUIDE_ROWS.forEach(rowData => {
    const row = document.createElement('div');
    row.className = 'fg-row';
    rowData.forEach(k => {
      const key = document.createElement('div');
      key.className = 'fg-key';
      key.dataset.finger = k.f;
      key.style.setProperty('--c', colorFor(k.f));
      key.style.width = (FG_KEY_UNIT * (k.w || 1)) + 'px';
      key.textContent = k.l;
      if (k.bump) {
        const bump = document.createElement('span');
        bump.className = 'fg-bump';
        key.appendChild(bump);
      }
      row.appendChild(key);
    });
    board.appendChild(row);
  });

  const spaceRow = document.createElement('div');
  spaceRow.className = 'fg-row';
  const spaceKey = document.createElement('div');
  spaceKey.className = 'fg-key fg-space';
  spaceKey.dataset.finger = 'thumb';
  spaceKey.style.setProperty('--c', colorFor('thumb'));
  spaceKey.textContent = 'space';
  spaceRow.appendChild(spaceKey);
  board.appendChild(spaceRow);

  ['left', 'thumbs', 'right'].forEach(handId => {
    const container = hands.querySelector(`[data-hand="${handId}"]`);
    FINGER_GUIDE.filter(f => f.hand === handId).forEach(f => {
      const chip = document.createElement('div');
      chip.className = 'fg-chip';
      chip.dataset.finger = f.id;
      chip.style.setProperty('--c', f.color);
      chip.innerHTML = `<span class="fg-dot"></span>${f.label}`;
      container.appendChild(chip);
    });
  });

  const targets = () => document.querySelectorAll('.fg-key, .fg-chip');
  let fgLocked = null;

  function fgHighlight(fingerId) {
    targets().forEach(el => {
      if (el.dataset.finger === fingerId) {
        el.classList.add('fg-active');
        el.classList.remove('fg-dimmed');
      } else {
        el.classList.remove('fg-active');
        el.classList.add('fg-dimmed');
      }
    });
  }
  function fgClear() {
    targets().forEach(el => el.classList.remove('fg-active', 'fg-dimmed'));
  }

  targets().forEach(el => {
    el.addEventListener('mouseenter', () => { if (!fgLocked) fgHighlight(el.dataset.finger); });
    el.addEventListener('mouseleave', () => { if (!fgLocked) fgClear(); });
    el.addEventListener('click', () => {
      if (fgLocked === el.dataset.finger) { fgLocked = null; fgClear(); }
      else { fgLocked = el.dataset.finger; fgHighlight(fgLocked); }
    });
  });
}

initFingerGuide();

const fingerGuideBtn   = document.getElementById('fingerGuideBtn');
const fingerGuidePanel = document.getElementById('fingerGuidePanel');
if (fingerGuideBtn && fingerGuidePanel) {
  fingerGuideBtn.addEventListener('click', () => {
    fingerGuidePanel.classList.toggle('hidden');
    fingerGuideBtn.classList.toggle('active');
  });
}

resetTest();
inputField.focus();