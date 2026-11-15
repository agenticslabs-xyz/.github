// Builds the Agentics Labs GitHub profile graphics.
// Text is converted to vector paths with the brand fonts (GitHub serves SVGs
// as images, which cannot load web fonts). Every graphic has a light and a
// dark version so it matches the visitor's GitHub theme.
import fs from 'node:fs';
import path from 'node:path';
import opentype from 'opentype.js';
import { PNG } from 'pngjs';
import { Resvg } from '@resvg/resvg-js';

const OUT = process.argv[2];
const PREVIEW = process.argv[3];
const BANNER_SRC = process.argv[4];
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(PREVIEW, { recursive: true });

const fontDir = (pkg) => path.join('node_modules', '@fontsource', pkg, 'files');
const F = {
  display: opentype.loadSync(path.join(fontDir('space-grotesk'), 'space-grotesk-latin-300-normal.woff')),
  mono: opentype.loadSync(path.join(fontDir('jetbrains-mono'), 'jetbrains-mono-latin-400-normal.woff')),
  monoLight: opentype.loadSync(path.join(fontDir('jetbrains-mono'), 'jetbrains-mono-latin-300-normal.woff')),
  monoMedium: opentype.loadSync(path.join(fontDir('jetbrains-mono'), 'jetbrains-mono-latin-500-normal.woff')),
};

const THEMES = {
  light: { bg: '#f2f2f0', ink: '#0b0b0b', muted: '#8c8c88', hair: 'rgba(11,11,11,0.12)', pillText: '#f2f2f0' },
  dark: { bg: '#0b0b0b', ink: '#f2f2f0', muted: '#8c8c88', hair: 'rgba(242,242,240,0.14)', pillText: '#0b0b0b' },
};

const W = 1200;

function measure(font, str, size, tracking = 0, kerning = true) {
  const scale = size / font.unitsPerEm;
  const glyphs = font.stringToGlyphs(str);
  let w = 0;
  glyphs.forEach((g, i) => {
    w += g.advanceWidth * scale;
    if (i < glyphs.length - 1) {
      if (kerning) w += font.getKerningValue(g, glyphs[i + 1]) * scale;
      w += tracking * size;
    }
  });
  return w;
}

function text(font, str, x, y, size, { fill, tracking = 0, anchor = 'start', kerning = true } = {}) {
  const scale = size / font.unitsPerEm;
  const glyphs = font.stringToGlyphs(str);
  const width = measure(font, str, size, tracking, kerning);
  let cx = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x;
  let d = '';
  glyphs.forEach((g, i) => {
    d += g.getPath(cx, y, size).toPathData(2);
    cx += g.advanceWidth * scale;
    if (i < glyphs.length - 1) {
      if (kerning) cx += font.getKerningValue(g, glyphs[i + 1]) * scale;
      cx += tracking * size;
    }
  });
  return d ? `<path fill="${fill}" d="${d}"/>` : '';
}

function wrap(font, str, size, maxWidth, tracking = 0) {
  const lines = [];
  let line = '';
  for (const word of str.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(font, next, size, tracking) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Same number of lines as a plain wrap, but with the narrowest width that
// keeps that count, so the last line is not left with a single word.
function balanced(font, str, size, maxWidth, tracking = 0) {
  const target = wrap(font, str, size, maxWidth, tracking).length;
  let lo = maxWidth / 2;
  let hi = maxWidth;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (wrap(font, str, size, mid, tracking).length > target) lo = mid;
    else hi = mid;
  }
  return wrap(font, str, size, hi, tracking);
}

const svg = (h, body, t, label) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${h}" viewBox="0 0 ${W} ${h}" role="img" aria-label="${label}"><rect width="${W}" height="${h}" fill="${t.bg}"/>${body}</svg>`;

const outputs = [];
function emit(name, build) {
  for (const [mode, t] of Object.entries(THEMES)) {
    const { svg: content } = build(t);
    const file = `${name}-${mode}.svg`;
    fs.writeFileSync(path.join(OUT, file), content);
    const png = new Resvg(content, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
    fs.writeFileSync(path.join(PREVIEW, file.replace('.svg', '.png')), png);
    outputs.push(`${file} ${(Buffer.byteLength(content) / 1024).toFixed(0)} KiB`);
  }
}

// ---------- statement ----------
const STATEMENT = 'We build agents that reason, decide and act on their own, and that keep learning after they launch.';
emit('statement', (t) => {
  const size = 40;
  const lines = balanced(F.display, STATEMENT, size, 880);
  const top = 112;
  const lh = 54;
  const h = top + lines.length * lh + 64;
  let body = text(F.monoMedium, 'RESEARCH INTO AGENTIC INTELLIGENCE', W / 2, 72, 13, { fill: t.muted, tracking: 0.35, anchor: 'middle', kerning: false });
  lines.forEach((l, i) => {
    body += text(F.display, l, W / 2, top + 40 + i * lh, size, { fill: t.ink, anchor: 'middle', tracking: -0.01 });
  });
  return { svg: svg(h, body, t, `Research into agentic intelligence. ${STATEMENT}`) };
});

// ---------- research ----------
const RESEARCH = [
  ['01', 'INFINITE LEARNING', 'Agents that keep learning after they launch and get better the longer they run.'],
  ['02', 'AGENTIC INTELLIGENCE', 'Agents that reason, decide and act on their own, instead of waiting to be asked.'],
  ['03', 'AGENT SECURITY', 'Keeping autonomous agents safe to deploy, and defending systems when agents are turned against them.'],
];
emit('research', (t) => {
  const pad = 56;
  const gap = 56;
  const colW = (W - pad * 2 - gap * 2) / 3;
  const bodySize = 17;
  const lh = 28;
  const wrapped = RESEARCH.map(([, , b]) => balanced(F.mono, b, bodySize, colW));
  const maxLines = Math.max(...wrapped.map((l) => l.length));
  const bodyTop = 222;
  const h = bodyTop + maxLines * lh + 48;
  let body = text(F.monoMedium, 'RESEARCH', pad, 72, 13, { fill: t.ink, tracking: 0.35, kerning: false });
  body += `<rect x="${pad}" y="96" width="${W - pad * 2}" height="1" fill="${t.hair}"/>`;
  RESEARCH.forEach(([n, title], i) => {
    const x = pad + i * (colW + gap);
    if (i > 0) body += `<rect x="${x - gap / 2}" y="132" width="1" height="${h - 132 - 40}" fill="${t.hair}"/>`;
    body += text(F.monoLight, n, x, 150, 14, { fill: t.muted, tracking: 0.2, kerning: false });
    body += text(F.monoMedium, title, x, 186, 15, { fill: t.ink, tracking: 0.3, kerning: false });
    wrapped[i].forEach((l, j) => {
      body += text(F.mono, l, x, bodyTop + j * lh, bodySize, { fill: t.muted, kerning: false });
    });
  });
  return { svg: svg(h, body, t, RESEARCH.map(([, a, b]) => `${a}. ${b}`).join(' ')) };
});

// ---------- QuantX project card ----------
const QX = 'The first self-learning agent built for investing. It reasons about markets, acts on its own and improves the more it trades.';
emit('project-quantx', (t) => {
  const pad = 56;
  const lines = balanced(F.mono, QX, 17, 700);
  const h = 236 + lines.length * 28 + 56;
  let body = text(F.monoMedium, 'PROJECTS', pad, 72, 13, { fill: t.ink, tracking: 0.35, kerning: false });
  body += `<rect x="${pad}" y="96" width="${W - pad * 2}" height="1" fill="${t.hair}"/>`;
  body += text(F.monoLight, '01', pad, 150, 14, { fill: t.muted, tracking: 0.2, kerning: false });
  body += text(F.display, 'QuantX', pad, 214, 64, { fill: t.ink, tracking: -0.03 });
  lines.forEach((l, j) => {
    body += text(F.mono, l, pad, 262 + j * 28, 17, { fill: t.muted, kerning: false });
  });
  // Pill button in the site's style.
  const label = 'ENTER QUANTX';
  const lw = measure(F.monoMedium, label, 13, 0.25, false);
  const pw = lw + 64;
  const ph = 52;
  const px = W - pad - pw;
  const py = 198;
  body += `<rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="${ph / 2}" fill="${t.ink}"/>`;
  body += text(F.monoMedium, label, px + pw / 2, py + ph / 2 + 5, 13, { fill: t.pillText, tracking: 0.25, anchor: 'middle', kerning: false });
  body += text(F.mono, 'usequantx.com', px + pw / 2, py + ph + 34, 13, { fill: t.muted, anchor: 'middle', kerning: false });
  return { svg: svg(h, body, t, `Projects. QuantX. ${QX} Enter QuantX at usequantx.com.`) };
});

// ---------- footer link pills ----------
function pill(name, label, filled) {
  emit(name, (t) => {
    const size = 12;
    const lw = measure(F.monoMedium, label, size, 0.25, false);
    const pw = Math.round(lw + 56);
    const ph = 44;
    const fill = filled ? t.ink : 'none';
    const stroke = filled ? 'none' : t.ink;
    const textFill = filled ? t.pillText : t.ink;
    const body =
      `<rect x="1" y="1" width="${pw - 2}" height="${ph - 2}" rx="${(ph - 2) / 2}" fill="${fill}" stroke="${stroke}" stroke-opacity="0.35"/>` +
      text(F.monoMedium, label, pw / 2, ph / 2 + 4.5, size, { fill: textFill, tracking: 0.25, anchor: 'middle', kerning: false });
    // Transparent background so the pills sit on the page itself.
    return {
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${ph}" viewBox="0 0 ${pw} ${ph}" role="img" aria-label="${label}">${body}</svg>`,
    };
  });
}
pill('link-website', 'AGENTICSLABS.XYZ', true);
pill('link-quantx', 'QUANTX', false);

// ---------- banner, light and dark ----------
const src = PNG.sync.read(fs.readFileSync(BANNER_SRC));
fs.copyFileSync(BANNER_SRC, path.join(OUT, 'banner-light.png'));
const dark = new PNG({ width: src.width, height: src.height });
for (let i = 0; i < src.data.length; i += 4) {
  dark.data[i] = 255 - src.data[i];
  dark.data[i + 1] = 255 - src.data[i + 1];
  dark.data[i + 2] = 255 - src.data[i + 2];
  dark.data[i + 3] = src.data[i + 3];
}
fs.writeFileSync(path.join(OUT, 'banner-dark.png'), PNG.sync.write(dark));
fs.copyFileSync(path.join(OUT, 'banner-dark.png'), path.join(PREVIEW, 'banner-dark.png'));
outputs.push('banner-light.png', 'banner-dark.png');

console.log(outputs.join('\n'));
