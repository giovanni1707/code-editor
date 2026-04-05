/**
 * core/dom.js
 * All DOM references, cached once at startup.
 * LEFT_TABS / RIGHT_TABS map lang → { btn, surface, gutter, ta, hl }.
 */

'use strict';

const $ = id => document.getElementById(id);

/* ── Toolbar ─────────────────────────────────────────────────── */
const el = {
  speedRange:  $('speedRange'),
  speedNum:    $('speedNum'),
  layoutBtn:   $('layoutBtn'),
  themeBtn:    $('themeBtn'),
  settingsBtn: $('settingsBtn'),
  fsBtn:       $('fsBtn'),

  // Left column
  colLeft:       $('colLeft'),
  lineNumBtnL:   $('lineNumBtnL'),
  copyBtnL:      $('copyBtnL'),
  clearBtnL:     $('clearBtnL'),
  progressLeft:  $('progressLeft'),
  outLeft:       $('outLeft'),
  livePreviewL:  $('livePreviewL'),
  previewFrameL: $('previewFrameL'),
  refreshBtnL:   $('refreshBtnL'),
  modeBtnsL:     document.querySelectorAll('#colLeft .mode-btn'),
  fmtBtnL:       $('fmtBtnL'),
  runBtnL:       $('runBtnL'),
  pauseBtnL:     $('pauseBtnL'),
  resetBtnL:     $('resetBtnL'),
  playWrapL:     $('playWrapL'),

  // Right column
  colRight:      $('colRight'),
  lineNumBtnR:   $('lineNumBtnR'),
  copyBtnR:      $('copyBtnR'),
  clearBtnR:     $('clearBtnR'),
  progressRight: $('progressRight'),
  outRight:      $('outRight'),
  livePreviewR:  $('livePreviewR'),
  previewFrameR: $('previewFrameR'),
  refreshBtnR:   $('refreshBtnR'),
  modeBtnsR:     document.querySelectorAll('#colRight .mode-btn'),
  fmtBtnR:       $('fmtBtnR'),
  runBtnR:       $('runBtnR'),
  pauseBtnR:     $('pauseBtnR'),
  resetBtnR:     $('resetBtnR'),
  playWrapR:     $('playWrapR'),

  // Resizers
  vResizer:   $('vResizer'),
  hResizerL:  $('hResizerL'),
  hResizerR:  $('hResizerR'),
  liveWrapL:  $('liveWrapL'),
  liveWrapR:  $('liveWrapR'),

  // Status bar
  sbFileName: $('sbFileName'),
  sbLn:       $('sbLn'),
  sbCol:      $('sbCol'),
  sbLayout:   $('sbLayout'),

  // Settings modal
  settingsOverlay: $('settingsOverlay'),
  closeSettings:   $('closeSettings'),
  stgLines:        $('stgLines'),
  stgFontSize:     $('stgFontSize'),
  stgFontSizeVal:  $('stgFontSizeVal'),
  stgWrap:         $('stgWrap'),
  stgAutoPlay:     $('stgAutoPlay'),
  stgSemiPause:    $('stgSemiPause'),

  toast: $('toast'),

  // Console drawers (one per panel)
  consoleDrawerL:    $('consoleDrawerL'),
  consoleResizerL:   $('consoleResizerL'),
  consoleListL:      $('consoleListL'),
  consoleClearBtnL:  $('consoleClearBtnL'),
  consoleSplitBtnL:  $('consoleSplitBtnL'),
  consoleCloseBtnL:  $('consoleCloseBtnL'),
  consoleToggleBtnL: $('consoleToggleBtnL'),
  consoleBadgeL:     $('consoleBadgeL'),
  consoleFiltersL:   document.querySelectorAll('#consoleDrawerL .cn-filter'),

  // Console side-pane (split view)
  cnSidePaneL:       $('cnSidePaneL'),
  cnSideResizerL:    $('cnSideResizerL'),
  cnSideListL:       $('cnSideListL'),
  cnSideClearBtnL:   $('cnSideClearBtnL'),
  cnSideCloseBtnL:   $('cnSideCloseBtnL'),
  cnSideFiltersL:    document.querySelectorAll('#cnSidePaneL .cn-filter'),

  consoleDrawerR:    $('consoleDrawerR'),
  consoleResizerR:   $('consoleResizerR'),
  consoleListR:      $('consoleListR'),
  consoleClearBtnR:  $('consoleClearBtnR'),
  consoleSplitBtnR:  $('consoleSplitBtnR'),
  consoleCloseBtnR:  $('consoleCloseBtnR'),
  consoleToggleBtnR: $('consoleToggleBtnR'),
  consoleBadgeR:     $('consoleBadgeR'),
  consoleFiltersR:   document.querySelectorAll('#consoleDrawerR .cn-filter'),

  // Console side-pane (split view)
  cnSidePaneR:       $('cnSidePaneR'),
  cnSideResizerR:    $('cnSideResizerR'),
  cnSideListR:       $('cnSideListR'),
  cnSideClearBtnR:   $('cnSideClearBtnR'),
  cnSideCloseBtnR:   $('cnSideCloseBtnR'),
  cnSideFiltersR:    document.querySelectorAll('#cnSidePaneR .cn-filter'),
};

/* ── Per-side tab maps ───────────────────────────────────────── */
const LEFT_TABS = {
  html: { btn: null, surface: null, gutter: null, ta: null, hl: null },
  css:  { btn: null, surface: null, gutter: null, ta: null, hl: null },
  js:   { btn: null, surface: null, gutter: null, ta: null, hl: null },
};

const RIGHT_TABS = {
  html: { btn: null, surface: null, gutter: null, ta: null, hl: null },
  css:  { btn: null, surface: null, gutter: null, ta: null, hl: null },
  js:   { btn: null, surface: null, gutter: null, ta: null, hl: null },
};

function buildTabRefs() {
  // Left
  LEFT_TABS.html = { btn: $('LtabHtml'), surface: $('LsurfaceHtml'), gutter: $('LgutterHtml'), ta: $('LtaHtml'), hl: $('LhlHtml') };
  LEFT_TABS.css  = { btn: $('LtabCss'),  surface: $('LsurfaceCss'),  gutter: $('LgutterCss'),  ta: $('LtaCss'),  hl: $('LhlCss')  };
  LEFT_TABS.js   = { btn: $('LtabJs'),   surface: $('LsurfaceJs'),   gutter: $('LgutterJs'),   ta: $('LtaJs'),   hl: $('LhlJs')   };
  // Right
  RIGHT_TABS.html = { btn: $('RtabHtml'), surface: $('RsurfaceHtml'), gutter: $('RgutterHtml'), ta: $('RtaHtml'), hl: $('RhlHtml') };
  RIGHT_TABS.css  = { btn: $('RtabCss'),  surface: $('RsurfaceCss'),  gutter: $('RgutterCss'),  ta: $('RtaCss'),  hl: $('RhlCss')  };
  RIGHT_TABS.js   = { btn: $('RtabJs'),   surface: $('RsurfaceJs'),   gutter: $('RgutterJs'),   ta: $('RtaJs'),   hl: $('RhlJs')   };
}

/* ── Helpers ─────────────────────────────────────────────────── */
function activeTa(side) {
  const tabs = side === 'left' ? LEFT_TABS : RIGHT_TABS;
  return tabs[state.activeTab[side]].ta;
}
function activeTab(side) {
  const tabs = side === 'left' ? LEFT_TABS : RIGHT_TABS;
  return tabs[state.activeTab[side]];
}
function tabsFor(side) {
  return side === 'left' ? LEFT_TABS : RIGHT_TABS;
}
function progressEl(side) {
  return side === 'left' ? el.progressLeft : el.progressRight;
}
function outEl(side) {
  return side === 'left' ? el.outLeft : el.outRight;
}
function modeBtns(side) {
  return side === 'left' ? el.modeBtnsL : el.modeBtnsR;
}
