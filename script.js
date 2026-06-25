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
const diffBtns        = document.querySelectorAll('.diff-btn');
const typingContainer = document.getElementById('typingContainer');
const customTimeInput = document.getElementById('customTimeInput');
const customTimeBtn   = document.getElementById('customTimeBtn');

let words = [], wordEls = [], currentWord = 0, correctWords = 0, totalErrors = 0, totalTyped = 0;
let timerDuration = 60, timeLeft = 60, timerInterval = null, started = false, finished = false;
let wpmHistory = [], correctChars = 0, incorrectChars = 0, extraChars = 0, missedChars = 0, totalCharsTyped = 0;

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
  const letters = wordDiv.querySelectorAll('span');
  const target  = words[currentWord];
  letters.forEach((span, i) => {
    span.className = '';
    if (i < typed.length) span.classList.add(typed[i] === target[i] ? 'correct' : 'wrong');
  });
  const cursorPos = Math.min(typed.length, letters.length - 1);
  if (letters[cursorPos]) {
    if (typed.length < letters.length) letters[typed.length].classList.add('cursor');
    else letters[letters.length - 1].classList.add('cursor');
  }
}

function finalizeWord(typed) {
  const wordDiv = wordEls[currentWord];
  const target  = words[currentWord];
  const letters = wordDiv.querySelectorAll('span');
  let wordOk = typed === target;

  letters.forEach((span, i) => {
    span.className = '';
    if (i < typed.length) {
      const ok = typed[i] === target[i];
      span.classList.add(ok ? 'correct' : 'wrong');
      if (ok) correctChars++; else incorrectChars++;
    } else {
      span.classList.add('wrong');
      missedChars++;
    }
  });

  if (typed.length > target.length) extraChars += (typed.length - target.length);
  totalCharsTyped += typed.length + 1;

  if (wordOk) { correctWords++; wordDiv.classList.add('done-correct'); }
  else { totalErrors++; wordDiv.classList.add('done-wrong'); }

  wordDiv.classList.remove('active');
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

modeBtns.forEach(btn => {
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

resetTest();
inputField.focus();
