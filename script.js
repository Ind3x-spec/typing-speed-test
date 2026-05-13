/* ===========================
   TYPEFORGE — script.js
   Rebuilt with word-by-word approach
   =========================== */

'use strict';

// ── Word bank ──────────────────────────────────────────────────────────────
const WORD_BANK = [
  "the", "be", "to", "of", "and", "a", "in", "that", "have", "it",
  "for", "not", "on", "with", "he", "as", "you", "do", "at", "this",
  "but", "his", "by", "from", "they", "we", "say", "her", "she", "or",
  "an", "will", "my", "one", "all", "would", "there", "their", "what",
  "so", "up", "out", "if", "about", "who", "get", "which", "go", "me",
  "when", "make", "can", "like", "time", "no", "just", "him", "know",
  "take", "people", "into", "year", "your", "good", "some", "could",
  "them", "see", "other", "than", "then", "now", "look", "only", "come",
  "its", "over", "think", "also", "back", "after", "use", "two", "how",
  "our", "work", "first", "well", "way", "even", "new", "want", "because",
  "any", "these", "give", "day", "most", "us", "great", "between", "need",
  "large", "often", "hand", "high", "place", "hold", "turn", "move", "live",
  "soon", "night", "real", "life", "few", "north", "open", "seem", "together",
  "next", "white", "children", "begin", "got", "walk", "example", "ease",
  "paper", "group", "always", "music", "those", "both", "mark", "book",
  "letter", "until", "mile", "river", "car", "feet", "care", "second",
  "enough", "plain", "girl", "usual", "young", "ready", "above", "ever",
  "red", "list", "though", "feel", "talk", "bird", "body", "dog",
  "family", "direct", "pose", "leave", "song", "measure", "door", "product",
  "black", "short", "numeral", "class", "wind", "question", "happen", "complete",
  "ship", "area", "half", "rock", "order", "fire", "south", "problem", "piece",
  "told", "knew", "pass", "since", "top", "whole", "king", "point", "city",
  "play", "small", "number", "off", "always", "move", "show", "try", "plant"
];

// ── DOM refs ───────────────────────────────────────────────────────────────
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
const finalCorrect    = document.getElementById('finalCorrect');
const finalErrors     = document.getElementById('finalErrors');
const modeBtns        = document.querySelectorAll('.mode-btn');
const typingContainer = document.getElementById('typingContainer');

// ── State ──────────────────────────────────────────────────────────────────
let words         = [];   // array of word strings
let wordEls       = [];   // array of word <div> elements
let currentWord   = 0;    // index of current word being typed
let correctWords  = 0;
let totalErrors   = 0;
let totalTyped    = 0;    // total characters typed
let timerDuration = 60;
let timeLeft      = 60;
let timerInterval = null;
let started       = false;
let finished      = false;

// ── Generate words ─────────────────────────────────────────────────────────
function pickWords(count) {
  const arr = [];
  for (let i = 0; i < count; i++) {
    arr.push(WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)]);
  }
  return arr;
}

// ── Build the words display ────────────────────────────────────────────────
// Each word = a <div class="word"> containing <span>s for each letter
function buildDisplay() {
  wordsDisplay.innerHTML = '';
  wordEls = [];

  words.forEach((word, wi) => {
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

  // Mark the first word as active
  if (wordEls.length > 0) wordEls[0].classList.add('active');
}

// ── Render current word coloring based on typed input ─────────────────────
function renderCurrentWord(typed) {
  const wordDiv = wordEls[currentWord];
  if (!wordDiv) return;

  const letters = wordDiv.querySelectorAll('span');
  const target  = words[currentWord];

  letters.forEach((span, i) => {
    span.className = ''; // reset
    if (i < typed.length) {
      span.classList.add(typed[i] === target[i] ? 'correct' : 'wrong');
    }
  });

  // Show cursor after last typed character (or at start)
  const cursorPos = Math.min(typed.length, letters.length - 1);
  if (letters[cursorPos]) {
    // Add cursor class to the next untyped letter
    if (typed.length < letters.length) {
      letters[typed.length].classList.add('cursor');
    } else {
      // Typed past the word — show cursor on last letter
      letters[letters.length - 1].classList.add('cursor');
    }
  }
}

// ── Finalize a completed word (on space) ──────────────────────────────────
function finalizeWord(typed) {
  const wordDiv = wordEls[currentWord];
  const target  = words[currentWord];
  const letters = wordDiv.querySelectorAll('span');

  // Compare typed vs target letter by letter
  let wordOk = typed === target;

  letters.forEach((span, i) => {
    span.className = '';
    if (i < typed.length) {
      span.classList.add(typed[i] === target[i] ? 'correct' : 'wrong');
    } else {
      // Letters not typed — mark as wrong
      span.classList.add('wrong');
    }
  });

  if (wordOk) {
    correctWords++;
    wordDiv.classList.add('done-correct');
  } else {
    totalErrors++;
    wordDiv.classList.add('done-wrong');
  }

  wordDiv.classList.remove('active');
}

// ── Scroll display to keep active word visible ────────────────────────────
function scrollToActive() {
  const activeEl = wordEls[currentWord];
  if (!activeEl) return;
  const containerTop = wordsDisplay.offsetTop;
  const wordTop      = activeEl.offsetTop;
  // If word has moved past first row, scroll the container
  wordsDisplay.scrollTop = wordTop - containerTop;
}

// ── Stats ──────────────────────────────────────────────────────────────────
function calcWpm() {
  const elapsed = (timerDuration - timeLeft) / 60;
  if (elapsed === 0) return 0;
  return Math.round(correctWords / elapsed);
}

function calcAccuracy() {
  const total = correctWords + totalErrors;
  if (total === 0) return 100;
  return Math.round((correctWords / total) * 100);
}

function updateStats() {
  wpmEl.textContent       = calcWpm();
  accuracyEl.textContent  = calcAccuracy();
  timerEl.textContent     = timeLeft;
  errorsEl.textContent    = totalErrors;
  progressBar.style.width = (timeLeft / timerDuration * 100) + '%';
}

// ── Timer ──────────────────────────────────────────────────────────────────
function startTimer() {
  timerInterval = setInterval(() => {
    timeLeft--;
    updateStats();
    if (timeLeft <= 0) endTest();
  }, 1000);
}

function endTest() {
  clearInterval(timerInterval);
  finished = true;
  inputField.blur();

  finalWpm.textContent      = calcWpm();
  finalAccuracy.textContent = calcAccuracy() + '%';
  finalCorrect.textContent  = correctWords;
  finalErrors.textContent   = totalErrors;
  resultsOverlay.classList.remove('hidden');
}

// ── Reset ──────────────────────────────────────────────────────────────────
function resetTest() {
  clearInterval(timerInterval);
  timerInterval = null;
  started      = false;
  finished     = false;
  timeLeft     = timerDuration;
  currentWord  = 0;
  correctWords = 0;
  totalErrors  = 0;
  totalTyped   = 0;

  progressBar.style.transition = 'none';
  progressBar.style.width = '100%';
  setTimeout(() => { progressBar.style.transition = 'width 1s linear'; }, 50);

  words = pickWords(150);
  buildDisplay();
  updateStats();

  inputField.value = '';
  inputField.disabled = false;
  inputHint.classList.remove('hidden');
  resultsOverlay.classList.add('hidden');
}

// ── Input: listen to the real input value ─────────────────────────────────
// The key insight: let the browser handle the input normally.
// We read inputField.value on every 'input' event.
// On space: finalize current word, advance, clear input.
// On backspace at empty input: optionally go back (we keep it simple — no going back).

inputField.addEventListener('input', () => {
  if (finished) return;

  const typed = inputField.value;

  // Start timer on first real character
  if (!started && typed.trim().length > 0) {
    started = true;
    inputHint.classList.add('hidden');
    startTimer();
  }

  // Check if user pressed space (value ends with space)
  if (typed.endsWith(' ')) {
    const word = typed.trim(); // what they actually typed (without the space)

    // Don't advance on empty space at start
    if (word.length === 0) {
      inputField.value = '';
      return;
    }

    // Finalize the current word
    finalizeWord(word);

    // Move to next word
    currentWord++;

    if (currentWord >= words.length) {
      // Add more words dynamically
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

    // Activate next word
    if (wordEls[currentWord]) {
      wordEls[currentWord].classList.add('active');
      scrollToActive();
    }

    // Clear the input for the next word
    inputField.value = '';
    updateStats();
    return;
  }

  // Normal typing — re-render current word coloring
  renderCurrentWord(typed);
  updateStats();
});

// Prevent space from doing anything weird (like form submit or scroll)
inputField.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    resetTest();
    return;
  }
});

// ── Focus handling ─────────────────────────────────────────────────────────
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
  // Any keypress auto-focuses the input
  if (document.activeElement !== inputField) {
    inputField.focus();
  }
});

inputField.addEventListener('blur', () => {
  if (!started && !finished) inputHint.classList.remove('hidden');
});

// ── Mode buttons ───────────────────────────────────────────────────────────
modeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    modeBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    timerDuration = parseInt(btn.dataset.time, 10);
    resetTest();
  });
});

// ── Control buttons ────────────────────────────────────────────────────────
resetBtn.addEventListener('click', resetTest);
retryBtn.addEventListener('click', resetTest);

// ── Init ───────────────────────────────────────────────────────────────────
resetTest();