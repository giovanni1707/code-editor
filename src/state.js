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

/* ── File extension → surface lang mapping ───────────────────── */
const EXT_TO_LANG = {
  html: 'html', htm: 'html', svg: 'html', xml: 'html',
  css:  'css',  scss: 'css', less: 'css', sass: 'css',
  js:   'js',   ts:   'js',  jsx:  'js',  tsx:  'js',
  mjs:  'js',   cjs:  'js',  json: 'js',  md:   'js',
  txt:  'js',
};

/* ── File extension → dot colour ─────────────────────────────── */
const EXT_COLOR = {
  html: 'var(--red)',    htm:  'var(--red)',
  css:  'var(--blue)',   scss: 'var(--blue)',  less: 'var(--blue)',
  js:   'var(--yellow)', ts:   'var(--blue)',  jsx:  'var(--yellow)',
  tsx:  'var(--blue)',   json: 'var(--green)', md:   'var(--purple)',
};

/* ── Derive surface lang from a filename ─────────────────────── */
function extToLang(filename) {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  return EXT_TO_LANG[ext] || 'js';
}

/* ── Derive dot colour from a filename ───────────────────────── */
function extColor(filename) {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  return EXT_COLOR[ext] || 'var(--txt2)';
}

/* ── Generate a simple unique id ─────────────────────────────── */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ── Typewriter state factory ────────────────────────────────── */
function mkTw() {
  return { interval: null, index: 0, isPaused: false, isDone: false, segs: [], styles: '' };
}

/* ── Application state ───────────────────────────────────────── */
const state = {
  /* project: files and folders keyed by id */
  project: {
    files:   {},  // { [id]: { id, name, content, parentId } }
    folders: {},  // { [id]: { id, name, parentId, collapsed } }
  },

  /* which files are open per panel, and which is active */
  panelTabs: {
    left:  { openIds: [], activeId: null },
    right: { openIds: [], activeId: null },
  },
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

/* ── Project persistence ─────────────────────────────────────── */
function saveProject() {
  try {
    localStorage.setItem('ce:project', JSON.stringify(state.project));
  } catch (_) { toast && toast('Storage full — project not saved', 3000); }
}

function loadProject() {
  try {
    const p = JSON.parse(localStorage.getItem('ce:project') || 'null');
    if (!p) return;
    if (p.files)   Object.assign(state.project.files,   p.files);
    if (p.folders) Object.assign(state.project.folders, p.folders);
  } catch (_) {}
}

function savePanelTabs() {
  try {
    localStorage.setItem('ce:panelTabs', JSON.stringify(state.panelTabs));
  } catch (_) {}
}

function loadPanelTabs() {
  try {
    const p = JSON.parse(localStorage.getItem('ce:panelTabs') || 'null');
    if (!p) return;
    ['left', 'right'].forEach(side => {
      if (p[side]) Object.assign(state.panelTabs[side], p[side]);
    });
  } catch (_) {}
}

/* ── Session persistence ─────────────────────────────────────── */
const SESSION_VERSION = 3; // bump this to wipe old saved editor content

function saveSession() {
  try {
    localStorage.setItem('ce:session', JSON.stringify({ v: SESSION_VERSION, ...state.session }));
  } catch (_) { /* ignore — quota exceeded etc */ }
}

/* ── v2 → v3 migration ───────────────────────────────────────── */
function _migrateEditorContent(ec) {
  // Map old lang keys to default filenames
  const nameMap = { html: 'index.html', css: 'style.css', js: 'main.js' };
  // Collect unique content blocks (avoid duplicating if both panels had same content)
  const seen = {};
  ['left', 'right'].forEach(side => {
    if (!ec[side]) return;
    Object.entries(ec[side]).forEach(([lang, content]) => {
      if (!content) return;
      const name = nameMap[lang];
      if (seen[name]) {
        // Already created from the other panel — just open it there too
        const id = seen[name];
        if (!state.panelTabs[side].openIds.includes(id)) {
          state.panelTabs[side].openIds.push(id);
          if (!state.panelTabs[side].activeId) state.panelTabs[side].activeId = id;
        }
      } else {
        const id = uid();
        state.project.files[id] = { id, name, content };
        seen[name] = id;
        state.panelTabs[side].openIds.push(id);
        if (!state.panelTabs[side].activeId) state.panelTabs[side].activeId = id;
      }
    });
  });
}

function loadSession() {
  try {
    const s = JSON.parse(localStorage.getItem('ce:session') || 'null');
    if (s) {
      // v2 → v3: migrate old editorContent into project files
      if ((s.v || 1) < SESSION_VERSION && s.editorContent) {
        _migrateEditorContent(s.editorContent);
        s.editorContent = null;
      }
      if ((s.v || 1) < SESSION_VERSION) s.editorContent = null;
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
