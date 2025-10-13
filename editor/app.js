// DOM Elements
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const lineNumbersToggle = document.getElementById('lineNumbersToggle');
const splitViewBtnModal = document.getElementById('splitViewBtnModal');
const autoRunToggle = document.getElementById('autoRunToggle');
const fontSizeSlider = document.getElementById('fontSizeSlider');
const fontSizeValue = document.getElementById('fontSizeValue');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeToggleBtnModal = document.getElementById('themeToggleBtnModal');
const decreaseSpeedBtn = document.getElementById('decreaseSpeed');
const increaseSpeedBtn = document.getElementById('increaseSpeed');
const speedDisplay = document.getElementById('speedDisplay');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const cssStatusIndicator = document.getElementById('cssStatusIndicator');
const jsStatusIndicator = document.getElementById('jsStatusIndicator');
const editor = document.getElementById('editor');
const editorRight = document.getElementById('editorRight');
const leftContent = document.querySelector('.left-content');
const rightContent = document.querySelector('.right-content');
const resizer = document.getElementById('resizer');
const leftPanel = document.querySelector('.left-panel');
const rightPanel = document.querySelector('.right-panel');
const lineNumbersLeft = document.getElementById('lineNumbersLeft');
const lineNumbersRight = document.getElementById('lineNumbersRight');
const shortcutHint = document.getElementById('shortcutHint');
const panelButtons = document.querySelectorAll('.panel-btn');

// Default Settings
const defaultSettings = {
  splitViewEnabled: false,
  showLineNumbers: true,
  autoRun: true,
  fontSize: 14,
  theme: 'dark',
  typingSpeed: 20,
  showCssCode: true,
  showJsCode: true,
  showHtmlCode: true
};

// App State
const appState = {
  settings: {},
  leftPanel: {
    mode: 'edit',
    index: 0,
    content: '',
    typingInterval: null,
    parsedSegments: [],
    extractedStyles: '',
    isPaused: false,
    isComplete: false
  },
  rightPanel: {
    mode: 'edit',
    index: 0,
    content: '',
    typingInterval: null,
    parsedSegments: [],
    extractedStyles: '',
    isPaused: false,
    isComplete: false
  }
};

// Initialize the application
function init() {
  loadSettings();
  applySettings();
  setupEventListeners();
  loadDemoContent();
  setupResizer();
  updateLineNumbers(editor, lineNumbersLeft);
  updateLineNumbers(editorRight, lineNumbersRight);
  
// Remove all underlines
  editor.setAttribute('spellcheck', 'false');
  editor.setAttribute('autocomplete', 'off');
  editor.setAttribute('autocorrect', 'off');
  editor.setAttribute('autocapitalize', 'off');
  
  editorRight.setAttribute('spellcheck', 'false');
  editorRight.setAttribute('autocomplete', 'off');
  editorRight.setAttribute('autocorrect', 'off');
  editorRight.setAttribute('autocapitalize', 'off');

  // Apply syntax highlighting to edit mode
  applySyntaxHighlightingToEditor(editor);
  applySyntaxHighlightingToEditor(editorRight);
}

// Apply syntax highlighting to editor in edit mode
function applySyntaxHighlightingToEditor(editorElement) {
  // Create a highlighted overlay for the editor
  const wrapper = editorElement.closest('.editor-wrapper');
  if (!wrapper) return;
  
  // Add input listener to update highlighting
  editorElement.addEventListener('input', () => {
    updateEditorHighlighting(editorElement);
  });
  
  editorElement.addEventListener('scroll', () => {
    syncHighlightScroll(editorElement);
  });
  
  // Initial highlighting
  updateEditorHighlighting(editorElement);
}

// Update editor syntax highlighting
function updateEditorHighlighting(editorElement) {
  const wrapper = editorElement.closest('.editor-wrapper');
  if (!wrapper) return;
  
  let highlightOverlay = wrapper.querySelector('.highlight-overlay');
  
  if (!highlightOverlay) {
    highlightOverlay = document.createElement('pre');
    highlightOverlay.className = 'highlight-overlay';
    highlightOverlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      margin: 0;
      padding: 20px;
      font-family: "Fira Code", "Consolas", "Monaco", monospace;
      font-size: ${appState.settings.fontSize}px;
      line-height: 1.6;
      white-space: pre-wrap;
      word-wrap: break-word;
      pointer-events: none;
      background: transparent;
      color: transparent;
      overflow: hidden;
      z-index: 1;
      tab-size: 2;
    `;
    
    const lineNumbers = wrapper.querySelector('.line-numbers');
    if (lineNumbers) {
      wrapper.insertBefore(highlightOverlay, editorElement);
      highlightOverlay.style.left = lineNumbers.offsetWidth + 'px';
    } else {
      wrapper.insertBefore(highlightOverlay, editorElement);
    }
    
    // Make editor transparent for text but keep caret visible
    editorElement.style.position = 'relative';
    editorElement.style.zIndex = '2';
    editorElement.style.background = 'transparent';
    editorElement.style.color = 'transparent';
    editorElement.style.caretColor = 'var(--text-primary)';
  }
  
  const code = editorElement.value;
  const highlighted = Prism.highlight(code, Prism.languages.markup, 'markup');
  highlightOverlay.innerHTML = `<code class="language-markup">${highlighted}</code>`;
  
  // Sync scroll
  highlightOverlay.scrollTop = editorElement.scrollTop;
  highlightOverlay.scrollLeft = editorElement.scrollLeft;
} 

// Sync highlight overlay scroll with editor
function syncHighlightScroll(editorElement) {
  const wrapper = editorElement.closest('.editor-wrapper');
  if (!wrapper) return;
  
  const highlightOverlay = wrapper.querySelector('.highlight-overlay');
  if (highlightOverlay) {
    highlightOverlay.scrollTop = editorElement.scrollTop;
    highlightOverlay.scrollLeft = editorElement.scrollLeft;
  }
}

// Load settings from localStorage
function loadSettings() {
  const saved = localStorage.getItem('codeEditorSettings');
  appState.settings = saved ? JSON.parse(saved) : { ...defaultSettings };
  
  // Ensure showHtmlCode exists in loaded settings
  if (appState.settings.showHtmlCode === undefined) {
    appState.settings.showHtmlCode = true;
  }
}

// Save settings to localStorage
function saveSettings() {
  localStorage.setItem('codeEditorSettings', JSON.stringify(appState.settings));
}

// Apply settings to UI
function applySettings() {
  // Theme
  if (appState.settings.theme === 'light') {
    document.body.classList.add('light-mode');
    document.getElementById('prism-theme-dark').disabled = true;
    document.getElementById('prism-theme-light').disabled = false;
  } else {
    document.body.classList.remove('light-mode');
    document.getElementById('prism-theme-dark').disabled = false;
    document.getElementById('prism-theme-light').disabled = true;
  }

  // Font size
  editor.style.fontSize = appState.settings.fontSize + 'px';
  editorRight.style.fontSize = appState.settings.fontSize + 'px';
  lineNumbersLeft.style.fontSize = appState.settings.fontSize + 'px';
  lineNumbersRight.style.fontSize = appState.settings.fontSize + 'px';
  fontSizeSlider.value = appState.settings.fontSize;
  fontSizeValue.textContent = appState.settings.fontSize + 'px';

  // Line numbers
  lineNumbersToggle.checked = appState.settings.showLineNumbers;
  toggleLineNumbers();

  // Auto-run
  autoRunToggle.checked = appState.settings.autoRun;

  // Typing speed
  speedDisplay.textContent = 'Speed: ' + appState.settings.typingSpeed + 'ms';

  // Split view
  if (appState.settings.splitViewEnabled) {
    document.body.classList.remove('single-panel-mode');
    splitViewBtnModal.textContent = 'Disable Split View';
    splitViewBtnModal.classList.add('active');
  } else {
    document.body.classList.add('single-panel-mode');
    splitViewBtnModal.textContent = 'Enable Split View';
    splitViewBtnModal.classList.remove('active');
  }
}

// Setup event listeners
function setupEventListeners() {
  // Settings modal
  settingsBtn.addEventListener('click', openSettings);
  closeSettingsBtn.addEventListener('click', closeSettings);
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) closeSettings();
  });

  // Settings controls
  lineNumbersToggle.addEventListener('change', handleLineNumbersToggle);
  splitViewBtnModal.addEventListener('click', handleSplitViewToggle);
  autoRunToggle.addEventListener('change', handleAutoRunToggle);
  fontSizeSlider.addEventListener('input', handleFontSizeChange);
  themeToggleBtn.addEventListener('click', handleThemeToggle);
  themeToggleBtnModal.addEventListener('click', handleThemeToggle);

  // Speed controls
  decreaseSpeedBtn.addEventListener('click', decreaseSpeed);
  increaseSpeedBtn.addEventListener('click', increaseSpeed);

  // Fullscreen
  fullscreenBtn.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', updateFullscreenButton);

  // Pause and Reset (global - kept for backward compatibility)
  pauseBtn.addEventListener('click', togglePause);
  resetBtn.addEventListener('click', resetTyping);

  // Toggle code visibility (global - kept for backward compatibility)
  cssStatusIndicator.addEventListener('click', toggleCssCode);
  jsStatusIndicator.addEventListener('click', toggleJsCode);

  // Per-panel controls
  document.querySelectorAll('.panel-pause-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const panel = e.currentTarget.dataset.panel;
      togglePanelPause(panel);
    });
  });

  document.querySelectorAll('.panel-reset-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const panel = e.currentTarget.dataset.panel;
      resetPanelTyping(panel);
    });
  });

  document.querySelectorAll('.panel-css-toggle').forEach(toggle => {
    toggle.addEventListener('click', (e) => {
      const panel = e.currentTarget.dataset.panel;
      togglePanelCss(panel);
    });
  });

  document.querySelectorAll('.panel-js-toggle').forEach(toggle => {
    toggle.addEventListener('click', (e) => {
      const panel = e.currentTarget.dataset.panel;
      togglePanelJs(panel);
    });
  });

  document.querySelectorAll('.panel-html-toggle').forEach(toggle => {
  toggle.addEventListener('click', (e) => {
    const panel = e.currentTarget.dataset.panel;
    togglePanelHtml(panel);
  });
});

  // Panel mode buttons
  panelButtons.forEach(btn => {
    btn.addEventListener('click', handlePanelModeChange);
  });

  // Editor input for line numbers
  editor.addEventListener('input', () => {
    updateLineNumbers(editor, lineNumbersLeft);
    updateEditorHighlighting(editor);
  });
  editor.addEventListener('scroll', () => {
    syncScroll();
    syncHighlightScroll(editor);
  });
  
  editorRight.addEventListener('input', () => {
    updateLineNumbers(editorRight, lineNumbersRight);
    updateEditorHighlighting(editorRight);
  });
  editorRight.addEventListener('scroll', () => {
    syncScrollRight();
    syncHighlightScroll(editorRight);
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboardShortcuts);

  // Show shortcut hint briefly on load
  setTimeout(() => {
    shortcutHint.classList.add('visible');
    setTimeout(() => {
      shortcutHint.classList.remove('visible');
    }, 3000);
  }, 1000);
}

// Settings Modal Functions
function openSettings() {
  settingsModal.classList.add('active');
}

function closeSettings() {
  settingsModal.classList.remove('active');
}

// Settings Handlers
function handleLineNumbersToggle() {
  appState.settings.showLineNumbers = lineNumbersToggle.checked;
  toggleLineNumbers();
  saveSettings();
}

function toggleLineNumbers() {
  const wrappers = document.querySelectorAll('.editor-wrapper');
  wrappers.forEach(wrapper => {
    if (appState.settings.showLineNumbers) {
      wrapper.classList.remove('no-line-numbers');
    } else {
      wrapper.classList.add('no-line-numbers');
    }
  });
  
  // Update highlight overlay position
  setTimeout(() => {
    updateEditorHighlighting(editor);
    updateEditorHighlighting(editorRight);
  }, 0);
}

function handleSplitViewToggle() {
  appState.settings.splitViewEnabled = !appState.settings.splitViewEnabled;
  
  if (appState.settings.splitViewEnabled) {
    document.body.classList.remove('single-panel-mode');
    splitViewBtnModal.textContent = 'Disable Split View';
    splitViewBtnModal.classList.add('active');
    leftPanel.style.flex = '1';
    rightPanel.style.flex = '1';
  } else {
    document.body.classList.add('single-panel-mode');
    splitViewBtnModal.textContent = 'Enable Split View';
    splitViewBtnModal.classList.remove('active');
  }
  
  saveSettings();
}

function handleAutoRunToggle() {
  appState.settings.autoRun = autoRunToggle.checked;
  saveSettings();
}

function handleFontSizeChange() {
  appState.settings.fontSize = parseInt(fontSizeSlider.value);
  editor.style.fontSize = appState.settings.fontSize + 'px';
  editorRight.style.fontSize = appState.settings.fontSize + 'px';
  lineNumbersLeft.style.fontSize = appState.settings.fontSize + 'px';
  lineNumbersRight.style.fontSize = appState.settings.fontSize + 'px';
  fontSizeValue.textContent = appState.settings.fontSize + 'px';
  
  // Update line numbers and highlighting after font size change
  updateLineNumbers(editor, lineNumbersLeft);
  updateLineNumbers(editorRight, lineNumbersRight);
  updateEditorHighlighting(editor);
  updateEditorHighlighting(editorRight);
  
  saveSettings();
}

function handleThemeToggle() {
  appState.settings.theme = appState.settings.theme === 'dark' ? 'light' : 'dark';
  
  if (appState.settings.theme === 'light') {
    document.body.classList.add('light-mode');
    document.getElementById('prism-theme-dark').disabled = true;
    document.getElementById('prism-theme-light').disabled = false;
  } else {
    document.body.classList.remove('light-mode');
    document.getElementById('prism-theme-dark').disabled = false;
    document.getElementById('prism-theme-light').disabled = true;
  }
  
  // Re-highlight code
  updateEditorHighlighting(editor);
  updateEditorHighlighting(editorRight);
  
  if (appState.leftPanel.mode === 'raw' || appState.rightPanel.mode === 'raw') {
    setTimeout(() => Prism.highlightAll(), 0);
  }
  
  saveSettings();
}

// Line Numbers Functions
function updateLineNumbers(textarea, lineNumbersDiv) {
  const lines = textarea.value.split('\n').length;
  const lineNumbersHTML = Array.from({ length: lines }, (_, i) => i + 1).join('\n');
  lineNumbersDiv.textContent = lineNumbersHTML;
}

function syncScroll() {
  lineNumbersLeft.scrollTop = editor.scrollTop;
}

function syncScrollRight() {
  lineNumbersRight.scrollTop = editorRight.scrollTop;
}

// Panel Mode Change Handler
function handlePanelModeChange(e) {
  const btn = e.currentTarget;
  const panel = btn.dataset.panel;
  const mode = btn.dataset.mode;
  
  // Update active button
  const siblingButtons = btn.parentElement.querySelectorAll('.panel-btn');
  siblingButtons.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  
  // Switch mode for the panel
  if (panel === 'left') {
    switchPanelMode('left', mode);
  } else {
    switchPanelMode('right', mode);
  }
}

function switchPanelMode(panel, mode) {
  const panelState = panel === 'left' ? appState.leftPanel : appState.rightPanel;
  const content = panel === 'left' ? leftContent : rightContent;
  const editorEl = panel === 'left' ? editor : editorRight;
  const lineNumbers = panel === 'left' ? lineNumbersLeft : lineNumbersRight;
  
  // Clear existing interval
  clearInterval(panelState.typingInterval);
  
  // Update mode
  panelState.mode = mode;
  
  // Handle mode switch
  if (mode === 'edit') {
    switchToEditMode(panel, panelState, content, editorEl, lineNumbers);
  } else if (mode === 'raw') {
    switchToRawCodeMode(panel, panelState, content, editorEl);
  } else if (mode === 'render') {
    switchToRenderMode(panel, panelState, content, editorEl);
  }
  
  updateStatusIndicators();
}

function switchToEditMode(panel, panelState, content, editorEl, lineNumbers) {
  content.innerHTML = '';
  content.classList.remove('rendered-mode');
  
  const wrapper = document.createElement('div');
  wrapper.className = 'editor-wrapper';
  if (!appState.settings.showLineNumbers) {
    wrapper.classList.add('no-line-numbers');
  }
  
  wrapper.appendChild(lineNumbers);
  wrapper.appendChild(editorEl);
  content.appendChild(wrapper);
  
  editorEl.style.display = 'block';
  
  // Re-apply syntax highlighting
  setTimeout(() => updateEditorHighlighting(editorEl), 0);
  
  removeDynamicStyles(panel);
  hideControls();
  hidePanelControls(panel);
}

function switchToRawCodeMode(panel, panelState, content, editorEl) {
  if (!panelState.isComplete || panelState.content !== editorEl.value) {
    panelState.content = editorEl.value;
    panelState.index = 0;
    panelState.isComplete = false;
    panelState.isPaused = false;
  }
  
  editorEl.style.display = 'none';
  content.innerHTML = '';
  content.classList.remove('rendered-mode');
  
  if (panelState.isComplete) {
    const filteredContent = filterRawCode(panelState.content);
    const contentDiv = createContentDisplay(content);
    contentDiv.innerHTML = '<pre><code class="language-markup">' + encodeHTML(filteredContent) + '</code></pre>';
    Prism.highlightAll();
  } else {
    createContentDisplay(content);
    if (appState.settings.autoRun) {
      panelState.typingInterval = setInterval(() => {
        typeRawCode(panel, panelState, content);
      }, appState.settings.typingSpeed);
    }
  }
  
  showControls();
  showPanelControls(panel, true, true, true);
}

function switchToRenderMode(panel, panelState, content, editorEl) {
  if (!panelState.isComplete || panelState.content !== editorEl.value) {
    panelState.content = editorEl.value;
    panelState.extractedStyles = extractStyles(panelState.content);
    panelState.parsedSegments = parseHTMLIntoSegments(panelState.content);
    panelState.index = 0;
    panelState.isComplete = false;
    panelState.isPaused = false;
  }
  
  editorEl.style.display = 'none';
  content.innerHTML = '';
  content.classList.add('rendered-mode');
  
  if (panelState.isComplete) {
    const totalChars = getTotalCharCount(panelState);
    const output = buildRenderedOutput(panelState, totalChars);
    const contentDiv = createContentDisplay(content);
    contentDiv.innerHTML = output;
    applyStyles(panelState.extractedStyles, panel);
    Prism.highlightAll();
  } else {
    createContentDisplay(content);
    if (appState.settings.autoRun) {
      panelState.typingInterval = setInterval(() => {
        typeRenderedHTML(panel, panelState, content);
      }, appState.settings.typingSpeed);
    }
  }
  
  showControls();
  showPanelControls(panel, true, true, true);
}

// Control Visibility
function hideControls() {
  const leftInEdit = appState.leftPanel.mode === 'edit';
  const rightInEdit = appState.rightPanel.mode === 'edit';
  
  if (leftInEdit && rightInEdit) {
    pauseBtn.classList.add('hidden-element');
    resetBtn.classList.add('hidden-element');
  }
}

function showControls() {
  const leftNotEdit = appState.leftPanel.mode !== 'edit';
  const rightNotEdit = appState.rightPanel.mode !== 'edit';
  
  if (leftNotEdit || rightNotEdit) {
    pauseBtn.classList.remove('hidden-element');
    resetBtn.classList.remove('hidden-element');
  }
}

// Per-Panel Control Visibility
function hidePanelControls(panel) {
  const panelEl = panel === 'left' ? leftPanel : rightPanel;
  const pauseBtn = panelEl.querySelector('.panel-pause-btn');
  const resetBtn = panelEl.querySelector('.panel-reset-btn');
  const cssToggle = panelEl.querySelector('.panel-css-toggle');
  const jsToggle = panelEl.querySelector('.panel-js-toggle');
  const htmlToggle = panelEl.querySelector('.panel-html-toggle');
  
  if (pauseBtn) pauseBtn.classList.add('hidden-element');
  if (resetBtn) resetBtn.classList.add('hidden-element');
  if (cssToggle) cssToggle.classList.add('hidden-element');
  if (jsToggle) jsToggle.classList.add('hidden-element');
  if (htmlToggle) htmlToggle.classList.add('hidden-element');
}

function showPanelControls(panel, showHtml, showJs, showCss) {
  const panelEl = panel === 'left' ? leftPanel : rightPanel;
  const pauseBtn = panelEl.querySelector('.panel-pause-btn');
  const resetBtn = panelEl.querySelector('.panel-reset-btn');
  const cssToggle = panelEl.querySelector('.panel-css-toggle');
  const jsToggle = panelEl.querySelector('.panel-js-toggle');
  const htmlToggle = panelEl.querySelector('.panel-html-toggle');
  
  if (pauseBtn) pauseBtn.classList.remove('hidden-element');
  if (resetBtn) resetBtn.classList.remove('hidden-element');
  
  if (htmlToggle) {
    if (showHtml) {
      htmlToggle.classList.remove('hidden-element');
      updatePanelStatusIndicators(panel);
    } else {
      htmlToggle.classList.add('hidden-element');
    }
  }
  
  if (jsToggle) {
    if (showJs) {
      jsToggle.classList.remove('hidden-element');
      updatePanelStatusIndicators(panel);
    } else {
      jsToggle.classList.add('hidden-element');
    }
  }
  
  if (cssToggle) {
    if (showCss) {
      cssToggle.classList.remove('hidden-element');
      updatePanelStatusIndicators(panel);
    } else {
      cssToggle.classList.add('hidden-element');
    }
  }
}

// Status Indicators
function updateStatusIndicators() {
  const inRawMode = appState.leftPanel.mode === 'raw' || appState.rightPanel.mode === 'raw';
  const inRenderMode = appState.leftPanel.mode === 'render' || appState.rightPanel.mode === 'render';
  
  cssStatusIndicator.textContent = `CSS: ${appState.settings.showCssCode ? 'ON' : 'OFF'}`;
  cssStatusIndicator.className = `status-indicator ${appState.settings.showCssCode ? 'active' : 'inactive'}`;
  
  jsStatusIndicator.textContent = `JS: ${appState.settings.showJsCode ? 'ON' : 'OFF'}`;
  jsStatusIndicator.className = `status-indicator ${appState.settings.showJsCode ? 'active' : 'inactive'}`;
  
  if (inRawMode) {
    cssStatusIndicator.classList.remove('hidden-element');
    jsStatusIndicator.classList.remove('hidden-element');
  } else if (inRenderMode) {
    cssStatusIndicator.classList.add('hidden-element');
    jsStatusIndicator.classList.remove('hidden-element');
  } else {
    cssStatusIndicator.classList.add('hidden-element');
    jsStatusIndicator.classList.add('hidden-element');
  }
}

// Per-Panel Pause/Resume
function togglePanelPause(panel) {
  const panelState = panel === 'left' ? appState.leftPanel : appState.rightPanel;
  const panelEl = panel === 'left' ? leftPanel : rightPanel;
  
  if (panelState.mode === 'edit') return;
  
  panelState.isPaused = !panelState.isPaused;
  
  const pauseBtn = panelEl.querySelector('.panel-pause-btn');
  if (pauseBtn) {
    pauseBtn.classList.toggle('paused', panelState.isPaused);
    pauseBtn.innerHTML = panelState.isPaused ? '<span class="pause-icon">▶</span>' : '<span class="pause-icon">⏸</span>';
  }
}

// Per-Panel Reset
function resetPanelTyping(panel) {
  const panelState = panel === 'left' ? appState.leftPanel : appState.rightPanel;
  const panelEl = panel === 'left' ? leftPanel : rightPanel;
  
  clearInterval(panelState.typingInterval);
  
  panelState.index = 0;
  panelState.isComplete = false;
  panelState.isPaused = false;
  
  const pauseBtn = panelEl.querySelector('.panel-pause-btn');
  if (pauseBtn) {
    pauseBtn.classList.remove('paused');
    pauseBtn.innerHTML = '<span class="pause-icon">⏸</span>';
  }
  
  if (panelState.mode !== 'edit') {
    switchPanelMode(panel, panelState.mode);
  }
}

// Per-Panel HTML Toggle
function togglePanelHtml(panel) {
  appState.settings.showHtmlCode = !appState.settings.showHtmlCode;
  updatePanelStatusIndicators(panel);
  saveSettings();
  
  const panelState = panel === 'left' ? appState.leftPanel : appState.rightPanel;
  const content = panel === 'left' ? leftContent : rightContent;
  
  if (panelState.mode === 'render') {
    const htmlBlocks = content.querySelectorAll('.rendered-html-content');
    htmlBlocks.forEach(block => {
      block.classList.toggle('hidden', !appState.settings.showHtmlCode);
    });
  } else if (panelState.mode === 'raw' && panelState.isComplete) {
    const filteredContent = filterRawCode(panelState.content);
    const contentDiv = content.querySelector('.content-display');
    if (contentDiv) {
      contentDiv.innerHTML = '<pre><code class="language-markup">' + encodeHTML(filteredContent) + '</code></pre>';
      Prism.highlightAll();
    }
  }
}

// Per-Panel CSS Toggle
function togglePanelCss(panel) {
  appState.settings.showCssCode = !appState.settings.showCssCode;
  updatePanelStatusIndicators(panel);
  saveSettings();
  
  const panelState = panel === 'left' ? appState.leftPanel : appState.rightPanel;
  const content = panel === 'left' ? leftContent : rightContent;
  
  if (panelState.mode === 'render') {
    const cssBlocks = content.querySelectorAll('.css-code-block');
    cssBlocks.forEach(block => {
      block.classList.toggle('hidden', !appState.settings.showCssCode);
    });
  } else if (panelState.mode === 'raw' && panelState.isComplete) {
    const filteredContent = filterRawCode(panelState.content);
    const contentDiv = content.querySelector('.content-display');
    if (contentDiv) {
      contentDiv.innerHTML = '<pre><code class="language-markup">' + encodeHTML(filteredContent) + '</code></pre>';
      Prism.highlightAll();
    }
  }
}

// Per-Panel JS Toggle
function togglePanelJs(panel) {
  appState.settings.showJsCode = !appState.settings.showJsCode;
  updatePanelStatusIndicators(panel);
  saveSettings();
  
  const panelState = panel === 'left' ? appState.leftPanel : appState.rightPanel;
  const content = panel === 'left' ? leftContent : rightContent;
  
  if (panelState.mode === 'render') {
    const jsBlocks = content.querySelectorAll('.js-code-block');
    jsBlocks.forEach(block => {
      block.classList.toggle('hidden', !appState.settings.showJsCode);
    });
  }
}

// Update Panel Status Indicators
function updatePanelStatusIndicators(panel) {
  const panelEl = panel === 'left' ? leftPanel : rightPanel;
  const htmlToggle = panelEl.querySelector('.panel-html-toggle');
  const cssToggle = panelEl.querySelector('.panel-css-toggle');
  const jsToggle = panelEl.querySelector('.panel-js-toggle');
  
  if (htmlToggle) {
    htmlToggle.textContent = appState.settings.showHtmlCode ? 'HTML' : 'HTML';
    htmlToggle.className = `panel-html-toggle status-indicator ${appState.settings.showHtmlCode ? 'active' :'inactive'}`;
  }
  
  if (cssToggle) {
    cssToggle.textContent = appState.settings.showCssCode ? 'CSS' : 'CSS';
    cssToggle.className = `panel-css-toggle status-indicator ${appState.settings.showCssCode ? 'active' : 'inactive'}`;
  }
  
  if (jsToggle) {
    jsToggle.textContent = appState.settings.showJsCode ? 'JS' : 'JS';
    jsToggle.className = `panel-js-toggle status-indicator ${appState.settings.showJsCode ? 'active' : 'inactive'}`;
  }
}

// Toggle Pause/Resume (Global - for backward compatibility)
function togglePause() {
  if (appState.leftPanel.mode !== 'edit') {
    appState.leftPanel.isPaused = !appState.leftPanel.isPaused;
  }
  
  if (appState.settings.splitViewEnabled && appState.rightPanel.mode !== 'edit') {
    appState.rightPanel.isPaused = !appState.rightPanel.isPaused;
  }
  
  const isPaused = appState.leftPanel.isPaused || appState.rightPanel.isPaused;
  pauseBtn.classList.toggle('paused', isPaused);
  pauseBtn.innerHTML = isPaused ? '<span class="pause-icon">▶</span> Resume' : '<span class="pause-icon">⏸</span> Pause';
}

// Reset Typing
function resetTyping() {
  clearInterval(appState.leftPanel.typingInterval);
  clearInterval(appState.rightPanel.typingInterval);
  
  appState.leftPanel.index = 0;
  appState.leftPanel.isComplete = false;
  appState.leftPanel.isPaused = false;
  
  appState.rightPanel.index = 0;
  appState.rightPanel.isComplete = false;
  appState.rightPanel.isPaused = false;
  
  pauseBtn.classList.remove('paused');
  pauseBtn.innerHTML = '<span class="pause-icon">⏸</span> Pause';
  
  if (appState.leftPanel.mode !== 'edit') {
    switchPanelMode('left', appState.leftPanel.mode);
  }
  
  if (appState.settings.splitViewEnabled && appState.rightPanel.mode !== 'edit') {
    switchPanelMode('right', appState.rightPanel.mode);
  }
}

// Speed Controls
function decreaseSpeed() {
  appState.settings.typingSpeed = Math.min(appState.settings.typingSpeed + 10, 200);
  speedDisplay.textContent = 'Speed: ' + appState.settings.typingSpeed + 'ms';
  saveSettings();
  
  restartTypingIntervals();
}

function increaseSpeed() {
  appState.settings.typingSpeed = Math.max(appState.settings.typingSpeed - 10, 10);
  speedDisplay.textContent = 'Speed: ' + appState.settings.typingSpeed + 'ms';
  saveSettings();
  
  restartTypingIntervals();
}

function restartTypingIntervals() {
  if (appState.leftPanel.mode === 'raw' && !appState.leftPanel.isComplete) {
    clearInterval(appState.leftPanel.typingInterval);
    appState.leftPanel.typingInterval = setInterval(() => {
      typeRawCode('left', appState.leftPanel, leftContent);
    }, appState.settings.typingSpeed);
  } else if (appState.leftPanel.mode === 'render' && !appState.leftPanel.isComplete) {
    clearInterval(appState.leftPanel.typingInterval);
    appState.leftPanel.typingInterval = setInterval(() => {
      typeRenderedHTML('left', appState.leftPanel, leftContent);
    }, appState.settings.typingSpeed);
  }
  
  if (appState.settings.splitViewEnabled) {
    if (appState.rightPanel.mode === 'raw' && !appState.rightPanel.isComplete) {
      clearInterval(appState.rightPanel.typingInterval);
      appState.rightPanel.typingInterval = setInterval(() => {
        typeRawCode('right', appState.rightPanel, rightContent);
      }, appState.settings.typingSpeed);
    } else if (appState.rightPanel.mode === 'render' && !appState.rightPanel.isComplete) {
      clearInterval(appState.rightPanel.typingInterval);
      appState.rightPanel.typingInterval = setInterval(() => {
        typeRenderedHTML('right', appState.rightPanel, rightContent);
      }, appState.settings.typingSpeed);
    }
  }
}

// Toggle CSS Code
function toggleCssCode() {
  appState.settings.showCssCode = !appState.settings.showCssCode;
  updateStatusIndicators();
  saveSettings();
  
  if (appState.leftPanel.mode === 'render' || appState.rightPanel.mode === 'render') {
    const cssBlocks = document.querySelectorAll('.css-code-block');
    cssBlocks.forEach(block => {
      block.classList.toggle('hidden', !appState.settings.showCssCode);
    });
  } else if (appState.leftPanel.mode === 'raw' || appState.rightPanel.mode === 'raw') {
    updateRawCodeDisplay();
  }
}

// Toggle JavaScript Code
function toggleJsCode() {
  appState.settings.showJsCode = !appState.settings.showJsCode;
  updateStatusIndicators();
  saveSettings();
  
  if (appState.leftPanel.mode === 'render' || appState.rightPanel.mode === 'render') {
    const jsBlocks = document.querySelectorAll('.js-code-block');
    jsBlocks.forEach(block => {
      block.classList.toggle('hidden', !appState.settings.showJsCode);
    });
  }
}

function updateRawCodeDisplay() {
  if (appState.leftPanel.isComplete && appState.leftPanel.mode === 'raw') {
    const filteredContent = filterRawCode(appState.leftPanel.content);
    const contentDiv = leftContent.querySelector('.content-display');
    if (contentDiv) {
      contentDiv.innerHTML = '<pre><code class="language-markup">' + encodeHTML(filteredContent) + '</code></pre>';
      Prism.highlightAll();
    }
  }
  
  if (appState.settings.splitViewEnabled && appState.rightPanel.isComplete && appState.rightPanel.mode === 'raw') {
    const filteredContent = filterRawCode(appState.rightPanel.content);
    const contentDiv = rightContent.querySelector('.content-display');
    if (contentDiv) {
      contentDiv.innerHTML = '<pre><code class="language-markup">' + encodeHTML(filteredContent) + '</code></pre>';
      Prism.highlightAll();
    }
  }
}

// Fullscreen Toggle
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.error('Error attempting to enable fullscreen:', err);
    });
  } else {
    document.exitFullscreen();
  }
}

function updateFullscreenButton() {
  fullscreenBtn.textContent = document.fullscreenElement ? '⛶ Exit' : '⛶';
}

// Resizer Setup
function setupResizer() {
  let isResizing = false;
  
  resizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    
    const container = document.getElementById('main-container');
    const containerRect = container.getBoundingClientRect();
    const leftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    
    if (leftWidth > 20 && leftWidth < 80) {
      leftPanel.style.flex = leftWidth;
      rightPanel.style.flex = 100 - leftWidth;
    }
  });
  
  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });
}

// Keyboard Shortcuts
function handleKeyboardShortcuts(e) {
  // Ctrl+Enter or Cmd+Enter: Run/Reset code
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    if (appState.leftPanel.mode !== 'edit' || appState.rightPanel.mode !== 'edit') {
      resetTyping();
    }
    shortcutHint.classList.add('visible');
    setTimeout(() => shortcutHint.classList.remove('visible'), 2000);
  }
  
  // Ctrl+S or Cmd+S: Open settings
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    openSettings();
  }
  
  // Escape: Close settings
  if (e.key === 'Escape' && settingsModal.classList.contains('active')) {
    closeSettings();
  }
}

// Utility Functions
function encodeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function createContentDisplay(container) {
  const div = document.createElement('div');
  div.className = 'content-display';
  container.appendChild(div);
  return div;
}

function extractStyles(html) {
  const stylePattern = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let styles = '';
  let match;
  
  while ((match = stylePattern.exec(html)) !== null) {
    styles += match[1] + '\n';
  }
  
  return styles;
}

function parseHTMLIntoSegments(html) {
  const segments = [];
  const allMatches = [];
  
  const scriptPattern = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  
  while ((match = scriptPattern.exec(html)) !== null) {
    allMatches.push({
      type: 'script',
      start: match.index,
      end: match.index + match[0].length,
      content: match[1].trim()
    });
  }
  
  const stylePattern = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  
  while ((match = stylePattern.exec(html)) !== null) {
    allMatches.push({
      type: 'style',
      start: match.index,
      end: match.index + match[0].length,
      content: match[1].trim()
    });
  }
  
  allMatches.sort((a, b) => a.start - b.start);
  
  let lastIndex = 0;
  
  for (let i = 0; i < allMatches.length; i++) {
    if (allMatches[i].start > lastIndex) {
      segments.push({
        type: 'html',
        content: html.substring(lastIndex, allMatches[i].start)
      });
    }
    
    segments.push({
      type: allMatches[i].type,
      content: allMatches[i].content
    });
    
    lastIndex = allMatches[i].end;
  }
  
  if (lastIndex < html.length) {
    segments.push({
      type: 'html',
      content: html.substring(lastIndex)
    });
  }
  
  return segments;
}

function getTotalCharCount(panelState) {
  let total = 0;
  for (let i = 0; i < panelState.parsedSegments.length; i++) {
    total += panelState.parsedSegments[i].content.length;
  }
  return total;
}

// UPDATED: Changed execution order to HTML -> JS -> CSS
function buildRenderedOutput(panelState, charIndex) {
  let htmlContent = '';
  let jsCodeBlocks = '';
  let cssCodeBlocks = '';
  let currentIndex = 0;
  
  for (let i = 0; i < panelState.parsedSegments.length; i++) {
    const segment = panelState.parsedSegments[i];
    const segmentLength = segment.content.length;
    
    if (currentIndex + segmentLength <= charIndex) {
      if (segment.type === 'html') {
        htmlContent += segment.content;
      } else if (segment.type === 'script') {
        jsCodeBlocks += '<div class="code-block js-code-block' + (appState.settings.showJsCode ? '' : ' hidden') + '">';
        jsCodeBlocks += '<div class="script-label">Javascript code:</div>';
        jsCodeBlocks += '<pre><code class="language-javascript">' + encodeHTML(segment.content) + '</code></pre>';
        jsCodeBlocks += '</div>';
      } else if (segment.type === 'style') {
        cssCodeBlocks += '<div class="code-block css-code-block' + (appState.settings.showCssCode ? '' : ' hidden') + '">';
        cssCodeBlocks += '<div class="style-label">CSS Code:</div>';
        cssCodeBlocks += '<pre><code class="language-css">' + encodeHTML(segment.content) + '</code></pre>';
        cssCodeBlocks += '</div>';
      }
      currentIndex += segmentLength;
    } else {
      const partialLength = charIndex - currentIndex;
      if (partialLength > 0) {
        if (segment.type === 'html') {
          htmlContent += segment.content.substring(0, partialLength);
        } else if (segment.type === 'script') {
          jsCodeBlocks += '<div class="code-block js-code-block' + (appState.settings.showJsCode ? '' : ' hidden') + '">';
          jsCodeBlocks += '<div class="script-label">JavaScript Code:</div>';
          jsCodeBlocks += '<pre><code class="language-javascript">' + encodeHTML(segment.content.substring(0, partialLength)) + '</code></pre>';
          jsCodeBlocks += '</div>';
        } else if (segment.type === 'style') {
          cssCodeBlocks += '<div class="code-block css-code-block' + (appState.settings.showCssCode ? '' : ' hidden') + '">';
          cssCodeBlocks += '<div class="style-label">CSS Code:</div>';
          cssCodeBlocks += '<pre><code class="language-css">' + encodeHTML(segment.content.substring(0, partialLength)) + '</code></pre>';
          cssCodeBlocks += '</div>';
        }
      }
      break;
    }
  }
  
  // UPDATED: Changed order - HTML first, then JS, then CSS
  let result = '';
  if (htmlContent && appState.settings.showHtmlCode) {
    result += '<div class="rendered-html-content' + (appState.settings.showHtmlCode ? '' : ' hidden') + '">' + htmlContent + '</div>';
  }
  if (jsCodeBlocks) {
    result += jsCodeBlocks;
  }
  if (cssCodeBlocks) {
    result += cssCodeBlocks;
  }
  
  return result;
}

function applyStyles(styles, panelId) {
  const styleId = 'dynamic-styles-' + panelId;
  const existingStyle = document.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
  }
  
  if (styles) {
    const styleTag = document.createElement('style');
    styleTag.id = styleId;
    styleTag.textContent = styles;
    document.head.appendChild(styleTag);
  }
}

function removeDynamicStyles(panel) {
  const styleId = 'dynamic-styles-' + panel;
  const style = document.getElementById(styleId);
  if (style) style.remove();
}

function filterRawCode(content) {
  let result = content;
  
  if (!appState.settings.showCssCode) {
    result = result.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  }
  
  if (!appState.settings.showJsCode) {
    result = result.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  }
  
  if (!appState.settings.showHtmlCode) {
    // Remove HTML but keep style and script tags
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = result;
    
    const scripts = tempDiv.querySelectorAll('script');
    const styles = tempDiv.querySelectorAll('style');
    
    let scriptContent = '';
    scripts.forEach(script => {
      scriptContent += script.outerHTML;
    });
    
    let styleContent = '';
    styles.forEach(style => {
      styleContent += style.outerHTML;
    });
    
    result = styleContent + scriptContent;
  }
  
  return result;
}

// Typewriter Functions
/*function typeRawCode(panel, panelState, container) {
  if (panelState.isPaused) return;
  
  if (panelState.index < panelState.content.length) {
    const filteredContent = filterRawCode(panelState.content);
    const visibleText = encodeHTML(filteredContent.slice(0, panelState.index));
    
    const contentDiv = container.querySelector('.content-display');
    if (contentDiv) {
      contentDiv.innerHTML = '<pre><code class="language-markup">' + visibleText + '</code></pre><span class="blinking-caret"></span>';
      Prism.highlightAll();
    }
    panelState.index++;
  } else {
    const filteredContent = filterRawCode(panelState.content);
    const contentDiv = container.querySelector('.content-display');
    if (contentDiv) {
      contentDiv.innerHTML = '<pre><code class="language-markup">' + encodeHTML(filteredContent) + '</code></pre>';
      Prism.highlightAll();
    }
    clearInterval(panelState.typingInterval);
    panelState.isComplete = true;
  }
} */

// Typewriter Functions
function typeRawCode(panel, panelState, container) {
  if (panelState.isPaused) return;
  
  if (panelState.index < panelState.content.length) {
    const filteredContent = filterRawCode(panelState.content);
    const visibleText = encodeHTML(filteredContent.slice(0, panelState.index));
    
    const contentDiv = container.querySelector('.content-display');
    if (contentDiv) {
      contentDiv.innerHTML = '<pre><code class="language-markup">' + visibleText + '</code></pre><span class="blinking-caret"></span>';
      Prism.highlightAll();
    }
    
    // Check if current character is a semicolon
    if (filteredContent[panelState.index - 1] === ';') {
      // Pause for 1 second before continuing
      clearInterval(panelState.typingInterval);
      setTimeout(() => {
        if (!panelState.isPaused && !panelState.isComplete) {
          panelState.typingInterval = setInterval(() => {
            if (panel === 'left') {
              typeRawCode('left', appState.leftPanel, leftContent);
            } else {
              typeRawCode('right', appState.rightPanel, rightContent);
            }
          }, appState.settings.typingSpeed);
        }
      }, 1000);
    }
    
    panelState.index++;
  } else {
    const filteredContent = filterRawCode(panelState.content);
    const contentDiv = container.querySelector('.content-display');
    if (contentDiv) {
      contentDiv.innerHTML = '<pre><code class="language-markup">' + encodeHTML(filteredContent) + '</code></pre>';
      Prism.highlightAll();
    }
    clearInterval(panelState.typingInterval);
    panelState.isComplete = true;
  }
}

/* function typeRenderedHTML(panel, panelState, container) {
  if (panelState.isPaused) return;
  
  const totalChars = getTotalCharCount(panelState);
  
  if (panelState.index < totalChars) {
    const output = buildRenderedOutput(panelState, panelState.index);
    const contentDiv = container.querySelector('.content-display');
    if (contentDiv) {
      contentDiv.innerHTML = output + '<span class="blinking-caret"></span>';
      applyStyles(panelState.extractedStyles, panel);
      // Don't highlight during typing - this prevents the vibration
    }
    panelState.index++;
  } else {
    const output = buildRenderedOutput(panelState, totalChars);
    const contentDiv = container.querySelector('.content-display');
    if (contentDiv) {
      contentDiv.innerHTML = output;
      applyStyles(panelState.extractedStyles, panel);
      // Only highlight when typing is complete
      setTimeout(() => Prism.highlightAll(), 0);
    }
    clearInterval(panelState.typingInterval);
    panelState.isComplete = true;
  }
} */

  function typeRenderedHTML(panel, panelState, container) {
  if (panelState.isPaused) return;
  
  const totalChars = getTotalCharCount(panelState);
  
  if (panelState.index < totalChars) {
    const output = buildRenderedOutput(panelState, panelState.index);
    const contentDiv = container.querySelector('.content-display');
    if (contentDiv) {
      contentDiv.innerHTML = output + '<span class="blinking-caret"></span>';
      applyStyles(panelState.extractedStyles, panel);
    }
    
    // Check if current character is a semicolon in any segment
    let currentIndex = 0;
    let foundSemicolon = false;
    for (let i = 0; i < panelState.parsedSegments.length; i++) {
      const segment = panelState.parsedSegments[i];
      if (currentIndex + segment.content.length > panelState.index - 1) {
        const posInSegment = panelState.index - 1 - currentIndex;
        if (posInSegment >= 0 && segment.content[posInSegment] === ';') {
          foundSemicolon = true;
          break;
        }
        break;
      }
      currentIndex += segment.content.length;
    }
    
    if (foundSemicolon) {
      // Pause for 1 second before continuing
      clearInterval(panelState.typingInterval);
      setTimeout(() => {
        if (!panelState.isPaused && !panelState.isComplete) {
          panelState.typingInterval = setInterval(() => {
            if (panel === 'left') {
              typeRenderedHTML('left', appState.leftPanel, leftContent);
            } else {
              typeRenderedHTML('right', appState.rightPanel, rightContent);
            }
          }, appState.settings.typingSpeed);
        }
      }, 1000);
    }
    
    panelState.index++;
  } else {
    const output = buildRenderedOutput(panelState, totalChars);
    const contentDiv = container.querySelector('.content-display');
    if (contentDiv) {
      contentDiv.innerHTML = output;
      applyStyles(panelState.extractedStyles, panel);
      // Only highlight when typing is complete
      setTimeout(() => Prism.highlightAll(), 0);
    }
    clearInterval(panelState.typingInterval);
    panelState.isComplete = true;
  }
}

// Load Demo Content
function loadDemoContent() {
  const demoCode = `

`;

  editor.value = demoCode;
  updateLineNumbers(editor, lineNumbersLeft);
  
  const demoCode2 = `

`;
  
  editorRight.value = demoCode2;
  updateLineNumbers(editorRight, lineNumbersRight);
}


// Initialize on page load
init();