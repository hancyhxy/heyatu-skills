#!/usr/bin/env node
// List every clip of a footage folder and draw labelled contact sheets for review.
//
//   node scan.mjs <footage>                        all clips: clips.json + sheets/page-NNN.jpg
//   node scan.mjs <footage> --clip c-03 --from 4 --to 7 --fps 6
//                                                  a closer look at one stretch: sheets/detail-*.jpg
// Options: --every <s> seconds between frames (default: 1, longer clips spread to --max frames),
//          --max <n> frames per clip (default 40).
// Each tile shows "<clip id> <time in the clip>". Output: one JSON object with the sheet list.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { args, canDrawText, toSdr, clipById, done, fail, labelFont, listAudio, listVideos, need, probe, readJson, run, workDir, writeJson } from './lib.mjs';

const opt = args();
const footage = opt._[0];
if (!footage || !fs.existsSync(footage)) fail('Give the footage folder: node scan.mjs <folder>');
const dir = workDir(footage);
const sheets = path.join(dir, 'sheets');
fs.mkdirSync(sheets, { recursive: true });
const ffmpeg = need('ffmpeg');
const font = canDrawText(ffmpeg) ? labelFont() : null;

function fingerprint(file, bytes) {
  const fd = fs.openSync(file, 'r');
  const n = Math.min(bytes, 4 * 1024 * 1024);
  const buf = Buffer.alloc(n);
  fs.readSync(fd, buf, 0, n, 0);
  fs.closeSync(fd);
  return crypto.createHash('sha1').update(buf).update(String(bytes)).digest('hex');
}

function inventory() {
  const old = readJson(path.join(dir, 'clips.json'), { clips: [] });
  const byPath = new Map(old.clips.map(c => [c.path, c]));
  const files = listVideos(footage);
  if (!files.length) fail('No video files in this folder.', 'Auto Edit reads the files directly in the folder, not in subfolders.');
  let next = old.clips.reduce((m, c) => Math.max(m, Number(c.id.slice(2)) || 0), 0);
  const clips = [];
  const seen = new Map();
  for (const file of files) {
    const st = fs.statSync(file);
    const prev = byPath.get(file);
    const same = prev && prev.bytes === st.size && prev.mtime === st.mtimeMs && 'hdr' in prev;
    const info = same ? prev : { ...probe(file), mtime: st.mtimeMs };
    const id = prev ? prev.id : `c-${String(++next).padStart(2, '0')}`;
    const clip = { ...info, id, name: path.basename(file), path: file };
    if (clip.ok) {
      const fp = fingerprint(file, st.size);
      if (seen.has(fp)) clip.duplicate_of = seen.get(fp);
      else seen.set(fp, id);
    }
    clips.push(clip);
  }
  clips.sort((a, b) => Number(a.id.slice(2)) - Number(b.id.slice(2)));
  const usable = clips.filter(c => c.ok && !c.duplicate_of);
  const vertical = usable.filter(c => c.height > c.width).length >= usable.length / 2;
  const music = listAudio(footage).map(file => {
    const r = run(need('ffprobe'), ['-v', 'error', '-print_format', 'json', '-show_format', file], { allowFail: true });
    let duration = 0;
    try { duration = Number(JSON.parse(r.stdout).format.duration) || 0; } catch {}
    return { name: path.basename(file), path: file, duration: Math.round(duration * 10) / 10 };
  });
  const data = { footage: path.resolve(footage), scanned: new Date().toISOString(), orientation: vertical ? 'vertical' : 'horizontal', clips, music };
  writeJson(path.join(dir, 'clips.json'), data);
  return data;
}

/** Frames of one clip stretch as labelled tiles in a folder. Returns the tile files in order. */
function tiles(clip, from, to, step, cell, out) {
  fs.mkdirSync(out, { recursive: true });
  const [w, h] = cell;
  const label = font
    ? `,drawtext=fontfile='${font.replace(/'/g, "\\'")}':text='${clip.id}  %{eif\\:t+${from}\\:d}.%{eif\\:mod((t+${from})*10\\,10)\\:d}s':x=8:y=h-th-8:fontsize=${Math.round(h / 13)}:fontcolor=white:box=1:boxcolor=black@0.65:boxborderw=5`
    : '';
  const vf = `${toSdr(clip)}fps=1/${step},scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=0x222222${label}`;
  run(ffmpeg, ['-nostdin', '-y', '-v', 'error', '-ss', String(from), '-t', String(to - from), '-i', clip.path, '-an', '-vf', vf, '-q:v', '4', path.join(out, `${clip.id}_%04d.jpg`)]);
  return fs.readdirSync(out).filter(f => f.startsWith(clip.id + '_')).sort().map(f => path.join(out, f));
}

/** Pack tiles into pages of cols × rows. Returns page files. */
function pages(files, prefix, grid) {
  const seq = fs.mkdtempSync(path.join(dir, '.seq-'));
  files.forEach((f, i) => fs.symlinkSync(f, path.join(seq, `${String(i + 1).padStart(5, '0')}.jpg`)));
  for (const old of fs.readdirSync(sheets)) if (old.startsWith(prefix + '-') && old.endsWith('.jpg')) fs.rmSync(path.join(sheets, old));
  run(ffmpeg, ['-nostdin', '-y', '-v', 'error', '-framerate', '1', '-i', path.join(seq, '%05d.jpg'),
    '-vf', `tile=${grid[0]}x${grid[1]}:padding=4:margin=4:color=white`, '-q:v', '3', path.join(sheets, `${prefix}-%03d.jpg`)]);
  fs.rmSync(seq, { recursive: true, force: true });
  return fs.readdirSync(sheets).filter(f => f.startsWith(prefix + '-') && f.endsWith('.jpg')).sort().map(f => path.join(sheets, f));
}

const data = inventory();
const vertical = data.orientation === 'vertical';
const cell = vertical ? [200, 356] : [356, 200];
const grid = vertical ? [8, 3] : [4, 6];
const perPage = grid[0] * grid[1];

if (opt.clip) {
  const clip = clipById(data, opt.clip);
  const from = Math.max(0, Number(opt.from || 0));
  const to = Math.min(clip.duration, Number(opt.to || clip.duration));
  const fps = Math.min(30, Math.max(1, Number(opt.fps || 6)));
  if (to - from > perPage * 2 / fps) fail(`That stretch is long for ${fps} fps.`, `Keep (to - from) × fps under ${perPage * 2} frames.`);
  const tmp = fs.mkdtempSync(path.join(dir, '.tiles-'));
  const files = tiles(clip, from, to, 1 / fps, cell, tmp);
  const out = pages(files, `detail-${clip.id}-${from.toFixed(1)}-${to.toFixed(1)}`, grid);
  fs.rmSync(tmp, { recursive: true, force: true });
  done({ ok: true, clip: clip.id, from, to, fps, frames: files.length, sheets: out });
}

const every = Number(opt.every || 1);
const max = Number(opt.max || 40);
const tmp = fs.mkdtempSync(path.join(dir, '.tiles-'));
const all = [];
const index = [];
for (const clip of data.clips) {
  if (!clip.ok || clip.duplicate_of || clip.duration <= 0) continue;
  const step = Math.max(every, clip.duration / max);
  const files = tiles(clip, 0, clip.duration, step, cell, tmp);
  for (const f of files) index.push(clip.id);
  all.push(...files);
}
const out = pages(all, 'page', grid);
fs.rmSync(tmp, { recursive: true, force: true });
const sheetList = out.map((file, i) => {
  const ids = [...new Set(index.slice(i * perPage, (i + 1) * perPage))];
  return { sheet: file, clips: ids };
});
writeJson(path.join(dir, 'sheets.json'), sheetList);
const skipped = data.clips.filter(c => !c.ok || c.duplicate_of).map(c => ({ id: c.id, name: c.name, reason: c.duplicate_of ? `same file as ${c.duplicate_of}` : c.error }));
done({
  ok: true,
  ...(font ? {} : { warning: 'Tiles have no labels: this ffmpeg cannot draw text. Run setup.mjs.' }),
  work: dir,
  orientation: data.orientation,
  clips: data.clips.length,
  reviewed: data.clips.length - skipped.length,
  minutes: Math.round(data.clips.filter(c => c.ok && !c.duplicate_of).reduce((s, c) => s + c.duration, 0) / 6) / 10,
  frames: all.length,
  music: data.music,
  sheets: sheetList,
  skipped,
});
