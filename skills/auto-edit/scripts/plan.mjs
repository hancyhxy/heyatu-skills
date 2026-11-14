// Read and check plan.json, and lay its segments on one timeline. Used by render.mjs and jianying-draft.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { CONFIG_PATH, fail, loadClips, readJson } from './lib.mjs';

export const DEFAULT_STYLE = { caption: { size: 7, color: '#ffffff', y: -0.72, shadow: true } };

/**
 * plan.json (in <footage>/auto-edit/):
 * { "title": "Morning run", "canvas": { "width": 1080, "height": 1920 }, "fps": 30,
 *   "segments": [ { "id": "S01", "clip": "c-02", "in": 26.0, "out": 27.5, "fit": "fill", "volume": 1,
 *                   "caption": "text shown while this shot plays", "line": "script line it serves" } ],
 *   "music": { "path": "/abs/song.mp3", "in": 0, "volume": 0.25 } }
 */
export function loadPlan(footage) {
  const { dir, clips } = loadClips(footage);
  const file = path.join(dir, 'plan.json');
  const plan = readJson(file, null);
  if (!plan) fail('plan.json is missing or not valid JSON.', `Write it to ${file}; see assemble.md.`);
  const style = { ...DEFAULT_STYLE, ...readJson(CONFIG_PATH, {}), ...(plan.style || {}) };
  const vertical = clips.orientation !== 'horizontal';
  // Default canvas: 1080p, or the largest source when every source is smaller (no upscaling).
  const short = Math.min(1080, Math.max(...clips.clips.filter(c => c.ok).map(c => Math.min(c.width, c.height))));
  const long = Math.round(short * 16 / 9 / 2) * 2;
  const width = Number(plan.canvas?.width || (vertical ? short : long));
  const height = Number(plan.canvas?.height || (vertical ? long : short));
  const fps = Number(plan.fps || 30);
  if (!Array.isArray(plan.segments) || !plan.segments.length) fail('plan.json has no segments.');
  const snap = s => Math.round(s * fps) / fps;
  const problems = [];
  let t = 0;
  const segments = plan.segments.map((sg, i) => {
    const id = sg.id || `S${String(i + 1).padStart(2, '0')}`;
    const clip = clips.clips.find(c => c.id === sg.clip);
    if (!clip) { problems.push(`${id}: unknown clip ${sg.clip}`); return null; }
    if (!clip.ok) { problems.push(`${id}: ${clip.id} cannot be read (${clip.error})`); return null; }
    if (!fs.existsSync(clip.path)) { problems.push(`${id}: file is gone: ${clip.path}`); return null; }
    const inS = Number(sg.in), outS = Number(sg.out);
    if (!(outS > inS)) { problems.push(`${id}: out must be after in`); return null; }
    if (inS < 0 || outS > clip.duration + 0.05) problems.push(`${id}: ${inS}–${outS}s is outside ${clip.id} (0–${clip.duration.toFixed(2)}s)`);
    const speed = Number(sg.speed || 1);
    const dur = snap((Math.min(outS, clip.duration) - inS) / speed);
    const seg = { ...sg, id, clip, in: inS, out: Math.min(outS, clip.duration), speed, start: snap(t), duration: dur,
      fit: sg.fit || (clip.height > clip.width === height > width ? 'fill' : 'fit'), volume: sg.volume ?? 1 };
    t = snap(t + dur);
    return seg;
  }).filter(Boolean);
  if (problems.length) fail('plan.json has problems.', problems.join('\n'));
  const captions = segments.filter(s => s.caption).map(s => ({ start: s.start, end: s.start + s.duration, text: String(s.caption) }));
  for (const c of plan.captions || []) captions.push({ start: Number(c.start), end: Number(c.end), text: String(c.text) });
  captions.sort((a, b) => a.start - b.start);
  return { dir, clips, plan, title: plan.title || path.basename(path.resolve(footage)), width, height, fps, segments, captions, duration: t, style };
}

/** The next free version number for files that start with prefix in a folder. */
export function nextVersion(folder, prefix) {
  let n = 0;
  if (fs.existsSync(folder)) for (const f of fs.readdirSync(folder)) {
    const m = f.startsWith(prefix) && f.slice(prefix.length).match(/^v(\d+)/);
    if (m) n = Math.max(n, Number(m[1]));
  }
  return `v${String(n + 1).padStart(2, '0')}`;
}

export const safeName = s => String(s).replace(/[\/\\:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 60) || 'Auto Edit';

export function srt(captions) {
  const ts = s => {
    const ms = Math.round(s * 1000);
    const p = (n, w = 2) => String(n).padStart(w, '0');
    return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
  };
  return captions.map((c, i) => `${i + 1}\n${ts(c.start)} --> ${ts(c.end)}\n${c.text}\n`).join('\n');
}
