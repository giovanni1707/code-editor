/**
 * app.js — Entry point.
 * Loads after all core/*.js scripts. Calls init() to boot the editor.
 *
 * Load order in editor.html:
 *   core/state.js → core/dom.js → core/editor.js → core/typewriter.js
 *   → core/panels.js → core/live-preview.js → core/console.js → core/ui.js → app.js
 */

'use strict';

/* ── Starter content per tab ─────────────────────────────────── */
const STARTER = {
  left: {
    html: `<div class="card">
  <h1>Hello, World!</h1>
  <p>Edit HTML here. Switch to <strong>CSS</strong> to style it,
     <strong>JS</strong> to add behaviour.</p>
  <button id="btn">Click me</button>
</div>`,

    css: `.card {
  font-family: system-ui, sans-serif;
  max-width: 480px;
  margin: 40px auto;
  padding: 28px 32px;
  border-radius: 10px;
  background: #1c2128;
  color: #e6edf3;
  box-shadow: 0 4px 24px rgba(0,0,0,.4);
}

h1 { color: #58a6ff; margin-bottom: 10px; }
p  { color: #8b949e; line-height: 1.6; }

button {
  margin-top: 16px;
  padding: 8px 20px;
  background: #3fb950;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}
button:hover { opacity: .85; }`,

    js: `const btn = document.getElementById('btn');
let count = 0;

btn.addEventListener('click', () => {
  count++;
  btn.textContent = \`Clicked \${count} time\${count === 1 ? '' : 's'}\`;
  console.log('Clicked', count, 'times');
});`,
  },

  right: {
    html: `<!-- Right panel — HTML -->
<div class="box">
  <h2>Comparison Panel</h2>
  <p>Use this panel independently — edit, typewrite, or live preview.</p>
</div>`,

    css: `/* Right panel — CSS */
.box {
  font-family: system-ui, sans-serif;
  padding: 24px;
  border: 2px solid #58a6ff;
  border-radius: 8px;
  color: #e6edf3;
  max-width: 400px;
  margin: 30px auto;
}

h2 { color: #58a6ff; }`,

    js: `// Right panel — JavaScript
// Each panel is fully independent:
//   ✏  Edit  — free typing with syntax highlighting
//   ⌨  Raw   — typewriter animates the code
//   ⚡  Live  — live HTML/CSS/JS preview

console.log('Right panel ready!');`,
  },
};

/* ════════════════════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════════════════════ */
function init() {
  // 1. Build DOM ref maps
  buildTabRefs();

  // 2. Load persisted settings + session
  const isFirstVisit = !localStorage.getItem('ce:session');
  loadSettings();
  loadSession();

  // 3. Apply visual settings
  applyTheme();
  applyFontSize(state.settings.fontSize);
  applyWrap();

  // 4. Seed content — use saved content if available, else starter
  const sess = state.session;
  Object.entries(STARTER).forEach(([side, langs]) => {
    const tabs    = tabsFor(side);
    const saved   = sess.editorContent[side];
    Object.entries(langs).forEach(([lang, starterCode]) => {
      tabs[lang].ta.value = (saved[lang] !== null && saved[lang] !== undefined)
        ? saved[lang]
        : starterCode;
    });
  });

  // 5. Wire all events
  wireAllTextareas();
  wireTabButtons('left');
  wireTabButtons('right');
  wirePanelActions('left');
  wirePanelActions('right');
  wirePlayback('left');
  wirePlayback('right');
  wireLivePreview();
  wireConsole();
  wireFormatter();
  wireToolbar();
  wireSettings();
  wireKeyboard();

  // 6. Initial UI state
  el.speedRange.value     = state.settings.speed;
  el.speedNum.textContent = state.settings.speed;
  el.lineNumBtnL.classList.toggle('active', state.settings.lineNums);
  el.lineNumBtnR.classList.toggle('active', state.settings.lineNums);
  setPlaybackVisible('left',  false);
  setPlaybackVisible('right', false);

  // 7. Restore tabs & modes from session
  switchTab('left',  sess.activeTab.left);
  switchTab('right', sess.activeTab.right);
  setPanelMode('left',  sess.panelMode.left);
  setPanelMode('right', sess.panelMode.right);

  // 8. Restore layout
  applyLayout(sess.layout);

  // 9. Resizer (must come before restoring split position)
  initResizer();

  // 10. Restore vertical split position
  if (sess.layout === 'split' && sess.splitPct !== 50) {
    const pct = sess.splitPct;
    el.colLeft.style.flex  = `0 0 ${pct}%`;
    el.colRight.style.flex = `0 0 ${100 - pct}%`;
  }

  // 11. Restore live h-resizer (preview pane widths)
  ['left', 'right'].forEach(side => {
    const w = sess.livePaneW[side];
    if (!w) return;
    const wrap = side === 'left' ? el.liveWrapL : el.liveWrapR;
    const editorPane = wrap.querySelector('.panel-editor-pane');
    const lp = side === 'left' ? el.livePreviewL : el.livePreviewR;
    const total = wrap.getBoundingClientRect().width;
    if (total > 0) {
      editorPane.style.flex = `0 0 ${w}px`;
      lp.style.flex         = `0 0 ${total - w}px`;
    }
  });

  // 12. Restore console state
  ['left', 'right'].forEach(side => {
    const refs = side === 'left' ? {
      drawer: el.consoleDrawerL, sidePane: el.cnSidePaneL,
      col: el.colLeft, splitBtn: el.consoleSplitBtnL,
      toggleBtn: el.consoleToggleBtnL,
    } : {
      drawer: el.consoleDrawerR, sidePane: el.cnSidePaneR,
      col: el.colRight, splitBtn: el.consoleSplitBtnR,
      toggleBtn: el.consoleToggleBtnR,
    };

    const h = sess.consoleHeight[side];
    if (h) refs.drawer.style.setProperty('--cn-h', h + 'px');

    const pw = sess.consolePaneW[side];
    if (pw) {
      (side === 'left' ? el.cnSidePaneL : el.cnSidePaneR).style.flex = `0 0 ${pw}px`;
    }

    if (sess.consoleSplit[side]) {
      // Restore split pane mode
      setConsoleSplit(side, true);
    } else if (sess.consoleOpen[side]) {
      refs.drawer.classList.add('open');
      refs.toggleBtn.classList.add('active');
      consoleState(side).open = true;
    }
  });

  // 13. Highlight & gutter all tabs
  refreshAllHL();
  updateAllGutters();

  // 14. Status bar
  const activeLSide = sess.activeTab.left;
  updateStatus(tabsFor('left')[activeLSide].ta);

  if (isFirstVisit) {
    toast('Ready — each panel has its own Edit / Raw / Live modes', 3000);
  } else {
    toast('Session restored', 2000);
  }
}

init();
