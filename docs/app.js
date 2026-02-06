// Stopwatch + Firebase Auth (Google + Email/Password)
// -------------------------------------------------
// 1) Create a Firebase project.
// 2) Enable Authentication providers: Google, Email/Password.
// 3) Enable Firestore.
// 4) Paste your firebaseConfig below.
// 5) In Firebase Console -> Authentication -> Settings -> Authorized domains,
//    add your GitHub Pages domain once deployed.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  deleteUser,
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

// TODO: Replace with your Firebase project config
// (Firebase Console -> Project settings -> Your apps -> Web app)
const firebaseConfig = {`n  apiKey: AIzaSyDoCwvtmZy7X6f8XESEP1W-6JvF5gSxMGs,`n  authDomain: bnd8gstopwach.firebaseapp.com,`n  projectId: bnd8gstopwach,`n  storageBucket: bnd8gstopwach.firebasestorage.app,`n  messagingSenderId: 504573334563,`n  appId: 1:504573334563:web:6343fe1676f0e17d8a4d96,`n  measurementId: G-E4HM77KEYF,`n};

// ---------- DOM ----------
const authErrorEl = document.getElementById('authError');
const authInfoEl = document.getElementById('authInfo');
const userBadgeEl = document.getElementById('userBadge');

const signedOutPanel = document.getElementById('signedOutPanel');
const signedInPanel = document.getElementById('signedInPanel');

const emailEl = document.getElementById('email');
const passwordEl = document.getElementById('password');

const emailSignUpBtn = document.getElementById('emailSignUpBtn');
const emailSignInBtn = document.getElementById('emailSignInBtn');
const googleSignInBtn = document.getElementById('googleSignInBtn');
const signOutBtn = document.getElementById('signOutBtn');

const stopwatchCard = document.getElementById('stopwatchCard');
const lapsCard = document.getElementById('lapsCard');
const accountCard = document.getElementById('accountCard');

// Stopwatch UI
const timeEl = document.getElementById('time');
const statusEl = document.getElementById('status');
const startPauseBtn = document.getElementById('startPauseBtn');
const lapBtn = document.getElementById('lapBtn');
const resetBtn = document.getElementById('resetBtn');
const clearLapsBtn = document.getElementById('clearLapsBtn');
const lapsEl = document.getElementById('laps');

// Account deletion UI
const deleteStatusEl = document.getElementById('deleteStatus');
const requestDeletionBtn = document.getElementById('requestDeletionBtn');
const checkApprovalBtn = document.getElementById('checkApprovalBtn');
const deleteAccountBtn = document.getElementById('deleteAccountBtn');
const accountMsgEl = document.getElementById('accountMsg');

// ---------- Helpers ----------
function show(el) {
  el.classList.remove('hidden');
}

function hide(el) {
  el.classList.add('hidden');
}

function setText(el, text) {
  el.textContent = text;
}

function showError(message) {
  setText(authErrorEl, message);
  show(authErrorEl);
}

function clearError() {
  hide(authErrorEl);
  setText(authErrorEl, '');
}

function showAccountMsg(message, isError = false) {
  setText(accountMsgEl, message);
  accountMsgEl.classList.toggle('message--error', isError);
  show(accountMsgEl);
}

function clearAccountMsg() {
  hide(accountMsgEl);
  accountMsgEl.classList.remove('message--error');
  setText(accountMsgEl, '');
}

function maskEmail(email) {
  if (!email) return 'Signed in';
  const [name, domain] = email.split('@');
  const safeName = name.length <= 2 ? name : `${name.slice(0, 2)}***`;
  return `${safeName}@${domain}`;
}

function isConfigSet(cfg) {
  return (
    cfg &&
    cfg.apiKey &&
    cfg.authDomain &&
    cfg.projectId &&
    cfg.appId &&
    !String(cfg.apiKey).includes('PASTE_ME')
  );
}

// ---------- Firebase init ----------
let app;
let auth;
let db;

if (isConfigSet(firebaseConfig)) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} else {
  // Keep UI usable for local dev preview, but disable auth actions.
  showError('Firebase config is not set yet. Open app.js and paste your firebaseConfig.');
}

// ---------- Stopwatch logic ----------
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

function renderTime() {
  timeEl.textContent = formatTime(getCurrentElapsedMs());
}

function updateButtons() {
  const hasTime = getCurrentElapsedMs() > 0;

  if (running) startPauseBtn.textContent = 'Pause';
  else startPauseBtn.textContent = hasTime ? 'Resume' : 'Start';

  lapBtn.disabled = !running;
  resetBtn.disabled = !hasTime && laps.length === 0;
  clearLapsBtn.disabled = laps.length === 0;
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

  if (lapsEl.firstChild) lapsEl.insertBefore(li, lapsEl.firstChild);
  else lapsEl.appendChild(li);

  updateButtons();
}

// Gate stopwatch UI
function setAuthedUI(user) {
  if (user) {
    hide(signedOutPanel);
    show(signedInPanel);

    show(stopwatchCard);
    show(lapsCard);
    show(accountCard);

    setText(userBadgeEl, maskEmail(user.email) || user.displayName || 'Signed in');
    userBadgeEl.classList.remove('hidden');
    setText(authInfoEl, `Signed in as ${user.email || user.displayName || user.uid}`);

  } else {
    show(signedOutPanel);
    hide(signedInPanel);

    hide(stopwatchCard);
    hide(lapsCard);
    hide(accountCard);

    userBadgeEl.classList.add('hidden');
    setText(authInfoEl, '');

    // Stop timer on sign-out
    reset();
  }
}

// ---------- Account deletion (admin-approved) ----------
// Firestore doc structure (collection: deletionRequests)
// deletionRequests/{uid}:
//   {
//     requested: true,
//     requestedAt: serverTimestamp,
//     approved: false,
//     approvedAt: timestamp|null,
//     approvedBy: string|null
//   }
// Admin will manually set approved=true in Firestore.

function requestDocRef(uid) {
  return doc(db, 'deletionRequests', uid);
}

async function requestDeletion(user) {
  clearAccountMsg();
  const ref = requestDocRef(user.uid);
  await setDoc(
    ref,
    {
      requested: true,
      requestedAt: serverTimestamp(),
      approved: false,
      approvedAt: null,
      approvedBy: null,
      email: user.email || null,
    },
    { merge: true },
  );
  setText(deleteStatusEl, 'Requested');
  deleteStatusEl.className = 'badge badge--warn';
  showAccountMsg('Deletion requested. Please wait for admin approval.');
}

async function checkDeletionApproval(user) {
  clearAccountMsg();
  const snap = await getDoc(requestDocRef(user.uid));
  const data = snap.exists() ? snap.data() : null;

  if (!data || !data.requested) {
    setText(deleteStatusEl, 'No request');
    deleteStatusEl.className = 'badge badge--muted';
    deleteAccountBtn.disabled = true;
    showAccountMsg('No deletion request found. Click â€œRequest deletionâ€.');
    return;
  }

  if (data.approved) {
    setText(deleteStatusEl, 'Approved');
    deleteStatusEl.className = 'badge badge--ok';
    deleteAccountBtn.disabled = false;
    showAccountMsg('Approved. You can now delete your account.');
    return;
  }

  setText(deleteStatusEl, 'Pending approval');
  deleteStatusEl.className = 'badge badge--warn';
  deleteAccountBtn.disabled = true;
  showAccountMsg('Still pending admin approval.');
}

async function deleteMyAccount(user) {
  clearAccountMsg();

  // Safety: require approval flag
  const snap = await getDoc(requestDocRef(user.uid));
  const data = snap.exists() ? snap.data() : null;

  if (!data || !data.approved) {
    deleteAccountBtn.disabled = true;
    setText(deleteStatusEl, 'Not approved');
    deleteStatusEl.className = 'badge badge--warn';
    showAccountMsg('Deletion not approved yet.', true);
    return;
  }

  // Firebase requires recent login for deleteUser; if it fails, user must re-auth.
  await deleteUser(user);
  showAccountMsg('Account deleted.', false);
}

// ---------- Wire events ----------
startPauseBtn.addEventListener('click', toggleStartPause);
lapBtn.addEventListener('click', addLap);
resetBtn.addEventListener('click', reset);
clearLapsBtn.addEventListener('click', clearLaps);

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const key = e.key.toLowerCase();

  const target = e.target;
  const isTypingTarget =
    target &&
    (target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable);
  if (isTypingTarget) return;

  if (stopwatchCard.classList.contains('hidden')) return;

  if (key === ' ') {
    e.preventDefault();
    toggleStartPause();
  } else if (key === 'r') {
    reset();
  } else if (key === 'l') {
    addLap();
  }
});

function requireFirebase() {
  if (!auth || !db) {
    showError('Firebase config is missing. Set firebaseConfig in app.js.');
    return false;
  }
  return true;
}

emailSignUpBtn.addEventListener('click', async () => {
  clearError();
  if (!requireFirebase()) return;
  try {
    await createUserWithEmailAndPassword(auth, emailEl.value.trim(), passwordEl.value);
  } catch (e) {
    showError(e?.message || 'Sign up failed');
  }
});

emailSignInBtn.addEventListener('click', async () => {
  clearError();
  if (!requireFirebase()) return;
  try {
    await signInWithEmailAndPassword(auth, emailEl.value.trim(), passwordEl.value);
  } catch (e) {
    showError(e?.message || 'Sign in failed');
  }
});

googleSignInBtn.addEventListener('click', async () => {
  clearError();
  if (!requireFirebase()) return;
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  } catch (e) {
    showError(e?.message || 'Google sign-in failed');
  }
});

signOutBtn.addEventListener('click', async () => {
  clearError();
  if (!requireFirebase()) return;
  await signOut(auth);
});

requestDeletionBtn.addEventListener('click', async () => {
  if (!requireFirebase()) return;
  const user = auth.currentUser;
  if (!user) return;
  try {
    await requestDeletion(user);
  } catch (e) {
    showAccountMsg(e?.message || 'Request failed', true);
  }
});

checkApprovalBtn.addEventListener('click', async () => {
  if (!requireFirebase()) return;
  const user = auth.currentUser;
  if (!user) return;
  try {
    await checkDeletionApproval(user);
  } catch (e) {
    showAccountMsg(e?.message || 'Check failed', true);
  }
});

deleteAccountBtn.addEventListener('click', async () => {
  if (!requireFirebase()) return;
  const user = auth.currentUser;
  if (!user) return;
  try {
    await deleteMyAccount(user);
  } catch (e) {
    // Common: requires recent login
    showAccountMsg(
      e?.message ||
        'Delete failed. You may need to sign out and sign back in (recent login required).',
      true,
    );
  }
});

// Auth state
if (auth) {
  onAuthStateChanged(auth, async (user) => {
    clearError();
    setAuthedUI(user);
    clearAccountMsg();

    if (user) {
      // Initialize deletion UI state
      setText(deleteStatusEl, 'No request');
      deleteStatusEl.className = 'badge badge--muted';
      deleteAccountBtn.disabled = true;

      // Try to load current request state
      try {
        await checkDeletionApproval(user);
      } catch {
        // ignore
      }
    }
  });
} else {
  // No Firebase config: keep everything hidden
  setAuthedUI(null);
}

// Initial UI
renderTime();
updateButtons();

