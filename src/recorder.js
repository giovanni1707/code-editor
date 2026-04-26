/**
 * src/recorder.js
 * Screen recorder using the browser Screen Capture API (getDisplayMedia).
 * Records whatever the user selects (tab, window, or screen) and
 * auto-downloads an .webm file when recording stops.
 */

'use strict';

let _stream    = null;
let _recorder  = null;
let _chunks    = [];
let _startTime = 0;
let _tickTimer = null;

const BTN_ID   = 'recBtn';
const TIMER_ID = 'recTimer';

/* ── Helpers ─────────────────────────────────────────────────── */
function _btn()   { return document.getElementById(BTN_ID); }
function _timer() { return document.getElementById(TIMER_ID); }

function _fmtTime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function _setRecording(on) {
  const btn   = _btn();
  const timer = _timer();
  if (!btn) return;
  btn.classList.toggle('rec-active', on);
  btn.title = on ? 'Stop recording' : 'Record screen';
  if (timer) timer.style.display = on ? 'inline' : 'none';
}

function _tick() {
  const timer = _timer();
  if (timer) timer.textContent = _fmtTime(Date.now() - _startTime);
}

/* ── Stop & save ─────────────────────────────────────────────── */
function _stopRecording() {
  if (_recorder && _recorder.state !== 'inactive') _recorder.stop();
}

function _cleanup() {
  clearInterval(_tickTimer);
  _setRecording(false);
  if (_stream) { _stream.getTracks().forEach(t => t.stop()); _stream = null; }
  _recorder = null;
  _chunks   = [];
}

function _save(chunks, mimeType) {
  const blob = new Blob(chunks, { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const ts   = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const ext  = mimeType.includes('mp4') ? 'mp4' : 'webm';
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `recording-${ts}.${ext}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/* ── Start recording ─────────────────────────────────────────── */
async function startRecording() {
  if (_recorder) { _stopRecording(); return; }

  let stream;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 30 },
      audio: true,               // captures tab audio when available
    });
  } catch (err) {
    if (err.name !== 'NotAllowedError') {
      toast('Screen capture failed: ' + err.message, 3000);
    }
    return;
  }

  // Pick the best supported MIME type
  const mimeType = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ].find(t => MediaRecorder.isTypeSupported(t)) || '';

  _stream  = stream;
  _chunks  = [];
  _recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});

  _recorder.ondataavailable = e => { if (e.data.size > 0) _chunks.push(e.data); };

  _recorder.onstop = () => {
    const chunks    = _chunks.slice();
    const usedMime  = _recorder.mimeType || 'video/webm';
    _cleanup();
    if (chunks.length) _save(chunks, usedMime);
    else toast('Recording was empty — nothing saved.', 2500);
  };

  // If the user stops sharing via the browser's built-in UI
  stream.getVideoTracks()[0].onended = () => _stopRecording();

  _recorder.start(1000); // collect chunks every second
  _startTime = Date.now();
  _setRecording(true);

  _tickTimer = setInterval(_tick, 500);
  toast('Recording started — click ⏺ again or stop sharing to save', 2500);
}

/* ── Public API ─────────────────────────────────────────────── */
function wireRecorder() {
  const btn = document.getElementById(BTN_ID);
  if (!btn) return;
  btn.addEventListener('click', startRecording);
}
