const timeEl = document.getElementById('time');
const statusEl = document.getElementById('status');

const startPauseBtn = document.getElementById('startPauseBtn');
const lapBtn = document.getElementById('lapBtn');
const resetBtn = document.getElementById('resetBtn');
const clearLapsBtn = document.getElementById('clearLapsBtn');

const lapsEl = document.getElementById('laps');

let running = false;
let startPerfMs = 0; // performance.now() at last start/resume
let elapsedMs = 0; // accumulated elapsed time when paused
let rafId = null;

let laps = []; // [{ lapMs, totalMs }]

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatTime(ms) {
  const totalCentis = Math.floor(ms / 10);
  const centis = totalCentis % 100;

  const totalSeconds = Math.floor(totalCentis / 100);
  const seconds = totalSeconds % 60;

  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;

  const hours = Math.floor(totalMinutes / 60);

  // Default look: mm:ss.xx, but show h:mm:ss.xx once you pass 1 hour.
  if (hours > 0) {
    return `${hours}:${pad2(minutes)}:${pad2(seconds)}.${pad2(centis)}`;
  }

  return `${pad2(minutes)}:${pad2(seconds)}.${pad2(centis)}`;
}

function getCurrentElapsedMs() {
  if (!running) return elapsedMs;
  return elapsedMs + (performance.now() - startPerfMs);
}

function setStatus(text) {
  statusEl.textContent = text;
}

function updateButtons() {
  const hasTime = getCurrentElapsedMs() > 0;

  // Start/Pause button label
  if (running) {
    startPauseBtn.textContent = 'Pause';
  } else {
    startPauseBtn.textContent = hasTime ? 'Resume' : 'Start';
  }

  lapBtn.disabled = !running;
  resetBtn.disabled = !hasTime && laps.length === 0;
  clearLapsBtn.disabled = laps.length === 0;
}

function renderTime() {
  timeEl.textContent = formatTime(getCurrentElapsedMs());
}

function tick() {
  renderTime();
  if (!running) return;
  rafId = requestAnimationFrame(tick);
}

function start() {
  if (running) return;
  running = true;
  startPerfMs = performance.now();
  setStatus('Running');
  updateButtons();
  rafId = requestAnimationFrame(tick);
}

function pause() {
  if (!running) return;
  // Capture elapsed time BEFORE flipping `running` to false.
  // Otherwise `getCurrentElapsedMs()` would return the already-paused value.
  elapsedMs = getCurrentElapsedMs();
  running = false;
  setStatus('Paused');
  updateButtons();

  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  renderTime();
}

function reset() {
  running = false;
  startPerfMs = 0;
  elapsedMs = 0;

  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  clearLaps();
  setStatus('Ready');
  renderTime();
  updateButtons();
}

function toggleStartPause() {
  if (running) pause();
  else start();
}

function clearLaps() {
  laps = [];
  lapsEl.innerHTML = '';
  updateButtons();
}

function addLap() {
  if (!running) return;

  const totalMs = getCurrentElapsedMs();
  const previousTotal = laps.length ? laps[laps.length - 1].totalMs : 0;
  const lapMs = totalMs - previousTotal;

  const lapIndex = laps.length + 1;
  laps.push({ lapMs, totalMs });

  const li = document.createElement('li');

  const left = document.createElement('span');
  left.className = 'lap__left';
  left.textContent = `Lap ${lapIndex}: ${formatTime(lapMs)}`;

  const right = document.createElement('span');
  right.className = 'lap__right';
  right.textContent = `Total ${formatTime(totalMs)}`;

  li.appendChild(left);
  li.appendChild(right);

  // Newest lap at the top
  if (lapsEl.firstChild) lapsEl.insertBefore(li, lapsEl.firstChild);
  else lapsEl.appendChild(li);

  updateButtons();
}

// Button events
startPauseBtn.addEventListener('click', toggleStartPause);
lapBtn.addEventListener('click', addLap);
resetBtn.addEventListener('click', reset);
clearLapsBtn.addEventListener('click', clearLaps);

// Keyboard shortcuts
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;

  const key = e.key.toLowerCase();

  // Don't interfere with typing in form fields
  const target = e.target;
  const isTypingTarget =
    target &&
    (target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable);
  if (isTypingTarget) return;

  if (key === ' ') {
    e.preventDefault();
    toggleStartPause();
  } else if (key === 'r') {
    reset();
  } else if (key === 'l') {
    addLap();
  }
});

// Initial UI state
renderTime();
updateButtons();
