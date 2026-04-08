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
const state = ReactiveUtils.state({
  /* project: files and folders keyed by id */
  project: {
    files:   {},  // { [id]: { id, name, content, parentId } }
    folders: {},  // { [id]: { id, name, parentId, collapsed } }
    _v: 0,        // version counter — bumped on structural changes (add/delete)
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
    tabSize:    2,    // indent width when Tab is pressed (2 or 4)
    minimap:    false, // show minimap panel
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
    livePaneW:       { left: null, right: null },  // internal h-resizer split %
    editorContent:   {
      left:  { html: null, css: null, js: null },
      right: { html: null, css: null, js: null },
    },
  },
});

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

/* ── Reactive effects — wired after init() in app.js ────────── */
function setupReactivity() {
  const { effect } = ReactiveUtils;

  // ── Auto-persist settings whenever any setting changes ───────
  effect(() => {
    const s = state.settings;
    // Access each property so the effect tracks all of them
    const _snap = s.theme + s.fontSize + s.lineNums + s.wordWrap +
                  s.autoPlay + s.semiPause + s.speed + s.tabSize + s.minimap;
    saveSettings();
  });

  // ── Auto-persist session whenever any session property changes
  effect(() => {
    // Deep-track session by serialising it
    JSON.stringify(ReactiveUtils.toRaw(state.session));
    saveSession();
  });

  // ── Speed display: input + numeric label ─────────────────────
  effect(() => {
    const speed = state.settings.speed;
    if (el.speedNum)   el.speedNum.textContent = speed;
    if (el.speedRange) el.speedRange.value     = speed;
  });

  // ── Line-number buttons (both panels stay in sync) ───────────
  effect(() => {
    const on = state.settings.lineNums;
    if (el.lineNumBtnL) el.lineNumBtnL.classList.toggle('active', on);
    if (el.lineNumBtnR) el.lineNumBtnR.classList.toggle('active', on);
  });

  // ── Theme ────────────────────────────────────────────────────
  effect(() => {
    const dark = state.settings.theme === 'dark';
    document.documentElement.classList.toggle('light', !dark);
    document.getElementById('prism-dark').disabled  = !dark;
    document.getElementById('prism-light').disabled =  dark;
  });

  // ── Layout: status-bar text + toolbar button ─────────────────
  effect(() => {
    const layout = state.layout;
    if (el.sbLayout) {
      el.sbLayout.textContent = layout === 'split'      ? 'SPLIT'
                              : layout === 'right-full' ? 'RIGHT' : 'LEFT';
    }
    if (el.layoutBtn) {
      el.layoutBtn.textContent = layout === 'split'      ? '⊟'
                               : layout === 'right-full' ? '▷' : '◁';
      el.layoutBtn.title = layout === 'split'      ? 'Right panel full (Ctrl+\\)'
                         : layout === 'right-full' ? 'Left panel full (Ctrl+\\)'
                         :                           'Split view (Ctrl+\\)';
    }
  });

  // ── Status-bar filename (left panel's active file) ───────────
  effect(() => {
    const fid  = state.panelTabs.left.activeId;
    const file = fid ? state.project.files[fid] : null;
    if (el.sbFileName) el.sbFileName.textContent = file ? file.name : '—';
  });

  // ── Phase 1: Explorer auto-render ────────────────────────────
  // Tracks _v for structural adds/deletes, and individual properties
  // for renames, parent moves, and folder collapse toggles.
  effect(() => {
    state.project._v; // structural version bump
    Object.keys(state.project.files).forEach(id => {
      const f = state.project.files[id];
      f.name; f.parentId;
    });
    Object.keys(state.project.folders).forEach(id => {
      const f = state.project.folders[id];
      f.name; f.parentId; f.collapsed;
    });
    // Also track which file is active per panel (explorer highlights active file)
    state.panelTabs.left.activeId;
    state.panelTabs.right.activeId;
    renderExplorer();
  });

  // ── Phase 1: Tab bars auto-render (one effect per panel) ─────
  // Tracks openIds.length (covers push/splice/assign) and activeId.
  ['left', 'right'].forEach(side => {
    effect(() => {
      state.panelTabs[side].openIds.length;
      state.panelTabs[side].activeId;
      state.project._v; // file renames change tab labels
      renderTabBar(side);
    });
  });

  // ── Phase 1: PanelTabs persistence ───────────────────────────
  effect(() => {
    state.panelTabs.left.openIds.length;
    state.panelTabs.left.activeId;
    state.panelTabs.right.openIds.length;
    state.panelTabs.right.activeId;
    savePanelTabs();
  });

  // ── Phase 2: Project auto-save (debounced) ───────────────────
  // Watches _v (structural changes) and file/folder metadata.
  // Content saves are handled separately by the editor's own debounce.
  let _projectSaveTimer;
  effect(() => {
    state.project._v;
    Object.keys(state.project.files).forEach(id => {
      const f = state.project.files[id];
      f.name; f.parentId;
    });
    Object.keys(state.project.folders).forEach(id => {
      const f = state.project.folders[id];
      f.name; f.parentId; f.collapsed;
    });
    clearTimeout(_projectSaveTimer);
    _projectSaveTimer = setTimeout(saveProject, 300);
  });

  // ── Phase 3: Settings modal inputs two-way binding ───────────
  // Inputs always reflect live state — openSettings() just shows the overlay.
  effect(() => {
    if (el.stgLines)     el.stgLines.checked              = state.settings.lineNums;
    if (el.stgFontSize)  el.stgFontSize.value             = state.settings.fontSize;
    if (el.stgFontSizeVal) el.stgFontSizeVal.textContent  = state.settings.fontSize + 'px';
    if (el.stgWrap)      el.stgWrap.checked               = state.settings.wordWrap;
    if (el.stgAutoPlay)  el.stgAutoPlay.checked           = state.settings.autoPlay;
    if (el.stgSemiPause) el.stgSemiPause.checked          = state.settings.semiPause;
    if (el.stgTabSize)   el.stgTabSize.value              = state.settings.tabSize;
    if (el.stgMinimap)   el.stgMinimap.checked            = state.settings.minimap;
  });

  // ── Minimap visibility ───────────────────────────────────────
  effect(() => {
    const on = state.settings.minimap;
    if (typeof applyMinimap === 'function') applyMinimap(on);
  });

  // ── Tab size: CSS variable for display + Tab key uses state ──
  effect(() => {
    const ts = state.settings.tabSize;
    document.documentElement.style.setProperty('--editor-tab-size', ts);
  });
}
