/**
 * core/state.js
 * Central application state, constants, and localStorage persistence.
 */

'use strict';

/* ── Language metadata ───────────────────────────────────────── */
const LANG_META = {
  html: { prism: 'markup',     color: 'var(--red)',    ext: 'html' },
  css:  { prism: 'css',        color: 'var(--blue)',   ext: 'css'  },
  js:   { prism: 'javascript', color: 'var(--yellow)', ext: 'js'   },
};

/* ── Typewriter state factory ────────────────────────────────── */
function mkTw() {
  return { interval: null, index: 0, isPaused: false, isDone: false, segs: [], styles: '' };
}

/* ── Application state ───────────────────────────────────────── */
const state = {
  /* each panel has its own independent mode */
  panelMode: { left: 'edit', right: 'edit' },  // 'edit' | 'raw' | 'live'

  /* which language tab is active on each side */
  activeTab: { left: 'js', right: 'js' },

  /* typewriter state per side */
  tw: { left: mkTw(), right: mkTw() },

  /* split layout: 'split' | 'left-full' | 'right-full' */
  layout: 'split',

  settings: {
    theme:      'dark',
    fontSize:   13,
    lineNums:   true,
    wordWrap:   true,
    autoPlay:   true,
    semiPause:  true,
    speed:      6,
  },

  /* session: panel UI state that persists between reloads */
  session: {
    panelMode:       { left: 'edit', right: 'edit' },
    activeTab:       { left: 'js',   right: 'js'   },
    layout:          'split',
    splitPct:        50,          // vertical resizer position (%)
    consoleSplit:    { left: false, right: false },
    consoleOpen:     { left: false, right: false },
    consoleHeight:   { left: 200,  right: 200  },
    consolePaneW:    { left: 320,  right: 320  },
    livePaneW:       { left: null, right: null },  // internal h-resizer px
    editorContent:   {
      left:  { html: null, css: null, js: null },
      right: { html: null, css: null, js: null },
    },
  },
};

/* ── Settings persistence ────────────────────────────────────── */
function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem('ce:settings') || 'null');
    if (s) Object.assign(state.settings, s);
  } catch (_) { /* ignore */ }
}

function saveSettings() {
  localStorage.setItem('ce:settings', JSON.stringify(state.settings));
}

/* ── Session persistence ─────────────────────────────────────── */
const SESSION_VERSION = 2; // bump this to wipe old saved editor content

function saveSession() {
  try {
    localStorage.setItem('ce:session', JSON.stringify({ v: SESSION_VERSION, ...state.session }));
  } catch (_) { /* ignore — quota exceeded etc */ }
}

function loadSession() {
  try {
    const s = JSON.parse(localStorage.getItem('ce:session') || 'null');
    if (s) {
      // If session is from before blank-slate change, wipe saved code
      if ((s.v || 1) < SESSION_VERSION) {
        s.editorContent = null;
      }
      // Deep merge only known keys to avoid stale shape issues
      if (s.panelMode)     Object.assign(state.session.panelMode,     s.panelMode);
      if (s.activeTab)     Object.assign(state.session.activeTab,     s.activeTab);
      if (s.layout)        state.session.layout = s.layout;
      if (s.splitPct != null) state.session.splitPct = s.splitPct;
      if (s.consoleSplit)  Object.assign(state.session.consoleSplit,  s.consoleSplit);
      if (s.consoleOpen)   Object.assign(state.session.consoleOpen,   s.consoleOpen);
      if (s.consoleHeight) Object.assign(state.session.consoleHeight, s.consoleHeight);
      if (s.consolePaneW)  Object.assign(state.session.consolePaneW,  s.consolePaneW);
      if (s.livePaneW)     Object.assign(state.session.livePaneW,     s.livePaneW);
      if (s.editorContent) {
        ['left','right'].forEach(side => {
          if (s.editorContent[side]) {
            Object.assign(state.session.editorContent[side], s.editorContent[side]);
          }
        });
      }
    }
  } catch (_) { /* ignore */ }
}

/* ── Speed helper ────────────────────────────────────────────── */
// speed 1 → ~180 ms/char,  speed 10 → ~7 ms/char  (exponential)
function speedMs() {
  return Math.round(180 / Math.pow(state.settings.speed, 1.38));
}
