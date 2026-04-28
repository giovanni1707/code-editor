/**
 * core/typewriter.js
 * Typewriter engine for both panels — Raw and Render modes.
 * Each side runs independently with its own pause/resume/restart.
 */

/* global Prism */
'use strict';

/* ── Stop ────────────────────────────────────────────────────── */
function stopTw(side) {
  clearInterval(state.tw[side].interval);
  clearTimeout(state.tw[side].interval);
  state.tw[side] = mkTw();
}

function stopAllTw() {
  stopTw('left');
  stopTw('right');
}

/* ── Pause / Resume (per side) ───────────────────────────────── */
function togglePause(side) {
  const tw = state.tw[side];
  tw.isPaused = !tw.isPaused;
  updatePauseBtn(side);
  // Human-typing mode uses recursive setTimeout — resume by re-scheduling
  if (!tw.isPaused && tw.resume) tw.resume();
}

function updatePauseBtn(side) {
  const btn = side === 'left' ? el.pauseBtnL : el.pauseBtnR;
  const tw  = state.tw[side];
  btn.textContent = tw.isPaused ? '▶ Resume' : '⏸ Pause';
  btn.classList.toggle('paused', tw.isPaused);
}

/* ── Semi-colon pause helper ─────────────────────────────────── */
// scheduleFn() must set tw.interval to the next timeout/interval handle
function semiPauseRestart(side, scheduleFn) {
  const tw = state.tw[side];
  clearInterval(tw.interval);
  clearTimeout(tw.interval);
  setTimeout(() => {
    if (!tw.isPaused && !tw.isDone) scheduleFn();
  }, 550);
}

/* ════════════════════════════════════════════════════════════════
   RAW TYPEWRITER
════════════════════════════════════════════════════════════════ */
function startRaw(side) {
  stopTw(side);
  const t       = activeTab(side);
  const lang    = state.activeTab[side];
  const prism   = LANG_META[lang].prism;
  const grammar = Prism.languages[prism] || Prism.languages.javascript;
  const code    = t.ta.value;
  const tw      = state.tw[side];
  const out     = outEl(side);
  const prog    = progressEl(side);

  tw.isDone = false;
  prog.style.width = '0%';
  prog.style.display = 'none';
  out.innerHTML = `<pre><code class="language-${prism}"></code></pre><span class="tw-caret"></span>`;
  const codeEl = out.querySelector('code');

  function schedule() {
    if (tw.isPaused) return; // chain suspended; togglePause will call schedule via tw.resume
    const delay = state.settings.humanTyping
      ? humanDelay(code[tw.index - 1], code[tw.index])
      : speedMs();
    tw.interval = setTimeout(tick, delay);
  }

  // Expose so togglePause can restart the chain after resume
  tw.resume = schedule;

  function tick() {
    if (tw.isPaused) return;
    if (tw.index <= code.length) {
      const partial = code.slice(0, tw.index);
      codeEl.innerHTML = Prism.highlight(partial, grammar, prism);
      if (state.settings.semiPause && tw.index > 0 && code[tw.index - 1] === ';') {
        semiPauseRestart(side, schedule);
        tw.index++;
        rawLiveRefresh(side, partial);
        return;
      }
      tw.index++;
      rawLiveRefresh(side, partial);
      schedule();
    } else {
      tw.isDone = true;
      codeEl.innerHTML = Prism.highlight(code, grammar, prism);
      prog.style.display = '';
      out.querySelector('.tw-caret')?.remove();
      updatePauseBtn(side);
      rawLiveRefresh(side, code);
    }
  }

  schedule();
}

/* ════════════════════════════════════════════════════════════════
   RENDER TYPEWRITER
════════════════════════════════════════════════════════════════ */
function parseSegs(code) {
  const matches = [];
  let m;
  const scriptRe = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  const styleRe  = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  while ((m = scriptRe.exec(code)) !== null)
    matches.push({ type: 'script', start: m.index, end: m.index + m[0].length, content: m[1].trim() });
  while ((m = styleRe.exec(code)) !== null)
    matches.push({ type: 'style',  start: m.index, end: m.index + m[0].length, content: m[1].trim() });
  matches.sort((a, b) => a.start - b.start);
  const segs = []; let last = 0;
  for (const match of matches) {
    if (match.start > last) segs.push({ type: 'html', content: code.slice(last, match.start) });
    segs.push({ type: match.type, content: match.content });
    last = match.end;
  }
  if (last < code.length) segs.push({ type: 'html', content: code.slice(last) });
  return segs;
}

function getStyles(code) {
  const re = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let css = '', m;
  while ((m = re.exec(code)) !== null) css += m[1] + '\n';
  return css;
}

function totalChars(segs) {
  return segs.reduce((n, s) => n + s.content.length, 0);
}

function buildRenderHTML(segs, idx) {
  const { showHtml, showCss } = state.settings;
  let htmlOut = '', jsBlocks = '', cssBlocks = '';
  let cur = 0;
  for (const seg of segs) {
    const end   = cur + seg.content.length;
    const slice = end <= idx ? seg.content : idx > cur ? seg.content.slice(0, idx - cur) : null;
    if (slice === null) break;
    if (seg.type === 'html') {
      htmlOut += slice;
    } else if (seg.type === 'script') {
      jsBlocks +=
        `<div class="out-block"><span class="out-block-label js">&#9656; JavaScript</span>` +
        `<div class="out-block-body js-body"><pre><code class="language-javascript">${encHTML(slice)}</code></pre></div></div>`;
    } else if (seg.type === 'style' && showCss) {
      cssBlocks +=
        `<div class="out-block"><span class="out-block-label css">&#9632; CSS</span>` +
        `<div class="out-block-body css-body"><pre><code class="language-css">${encHTML(slice)}</code></pre></div></div>`;
    }
    cur = end;
    if (cur >= idx) break;
  }
  let out = '';
  if (htmlOut && showHtml) out += `<div class="out-html-preview">${htmlOut}</div>`;
  out += jsBlocks + cssBlocks;
  return out;
}

function applyDynStyles(side, css) {
  const id  = `_dyn_styles_${side}`;
  let tag   = document.getElementById(id);
  if (!tag) {
    tag = document.createElement('style');
    tag.id = id;
    document.head.appendChild(tag);
  }
  tag.textContent = css;
}

function removeDynStyles(side) {
  document.getElementById(`_dyn_styles_${side}`)?.remove();
}

function removeDynStylesAll() {
  removeDynStyles('left');
  removeDynStyles('right');
}

function startRender(side) {
  stopTw(side);
  const t    = activeTab(side);
  const code = t.ta.value;
  const tw   = state.tw[side];
  const out  = outEl(side);
  const prog = progressEl(side);

  tw.segs   = parseSegs(code);
  tw.styles = getStyles(code);
  tw.isDone = false;
  const total = totalChars(tw.segs);
  out.innerHTML = '<span class="tw-caret"></span>';

  function tick() {
    if (tw.isPaused) return;
    if (tw.index <= total) {
      out.innerHTML = buildRenderHTML(tw.segs, tw.index) + '<span class="tw-caret"></span>';
      if (tw.styles) applyDynStyles(side, tw.styles);
      prog.style.width = (total ? tw.index / total * 100 : 0) + '%';

      // semicolon pause within script segments
      if (state.settings.semiPause && tw.index > 0) {
        let c = 0;
        for (const seg of tw.segs) {
          const end = c + seg.content.length;
          if (tw.index - 1 >= c && tw.index - 1 < end) {
            if (seg.content[tw.index - 1 - c] === ';') semiPauseRestart(side, tick);
            break;
          }
          c = end;
        }
      }
      tw.index++;
    } else {
      clearInterval(tw.interval);
      tw.isDone = true;
      out.innerHTML = buildRenderHTML(tw.segs, total);
      if (tw.styles) applyDynStyles(side, tw.styles);
      prog.style.width = '100%';
      setTimeout(() => Prism.highlightAll(), 0);
      updatePauseBtn(side);
    }
  }

  tw.interval = setInterval(tick, speedMs());
}

/* ── Start whichever typewriter mode is active ───────────────── */
function startTw(side) {
  const out = outEl(side);
  out.innerHTML = '';
  if (state.panelMode[side] === 'raw') startRaw(side);
}

/* ── Restart (reset progress then start) ────────────────────── */
function restartTw(side) {
  progressEl(side).style.width = '0%';
  startTw(side);
}
