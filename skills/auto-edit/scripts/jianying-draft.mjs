#!/usr/bin/env node
// Write plan.json as a new 剪映专业版 (Mac) draft that references the full original clips,
// so every cut keeps its trim handles. A black base on the main track keeps the montage in place.
//   node jianying-draft.mjs <footage> [--name "<draft name>"]
// Close 剪映 first or reopen its home page to see the draft. Never replaces an existing draft.
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SKILL_DIR, args, done, fail, need, run, toSdr } from './lib.mjs';
import { loadPlan, nextVersion, safeName } from './plan.mjs';

const opt = args();
const footage = opt._[0];
if (!footage) fail('Give the footage folder: node jianying-draft.mjs <folder>');
const p = loadPlan(footage);
const ROOT = process.env.AUTO_EDIT_DRAFT_ROOT || path.join(os.homedir(), 'Movies/JianyingPro/User Data/Projects/com.lveditor.draft');
if (!fs.existsSync(path.dirname(ROOT))) fail('剪映专业版 is not set up on this Mac.', 'Install 剪映专业版 for Mac and open it once, or use render.mjs for an MP4 only.');
const A = path.join(SKILL_DIR, 'assets', 'jianying');
const base = JSON.parse(fs.readFileSync(path.join(A, 'draft-base.json'), 'utf8'));
const shapes = JSON.parse(fs.readFileSync(path.join(A, 'shapes.json'), 'utf8'));
const clone = o => JSON.parse(JSON.stringify(o));
const uid = () => crypto.randomUUID().replace(/-/g, '');
const us = s => Math.round(Math.round(s * p.fps) * 1e6 / p.fps);
const total = us(p.duration);

// Black base clip, as long as the cut.
const blackDir = path.join(p.dir, 'jianying');
fs.mkdirSync(blackDir, { recursive: true });
const black = path.join(blackDir, `black-${p.width}x${p.height}-${p.fps}-${total}.mp4`);
if (!fs.existsSync(black)) run(need('ffmpeg'), ['-nostdin', '-y', '-v', 'error', '-f', 'lavfi', '-i', `color=c=black:s=${p.width}x${p.height}:r=${p.fps}`,
  '-t', String(total / 1e6 + 1), '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', black]);

const draft = clone(base);
draft.canvas_config = { width: p.width, height: p.height, ratio: 'original' };
draft.fps = p.fps;
draft.duration = total;
const materials = new Map();
function material(file, info) {
  if (materials.has(file)) return materials.get(file);
  const m = clone(shapes.video_material);
  m.id = m.material_id = uid();
  Object.assign(m, { path: file, material_name: path.basename(file), duration: Math.round(info.duration * 1e6), width: info.width, height: info.height });
  draft.materials.videos.push(m);
  materials.set(file, m.id);
  return m.id;
}
function track(kind, name) {
  const t = { ...clone(shapes[kind === 'text' ? 'text_track' : 'video_track']), id: uid(), name, segments: [] };
  draft.tracks.push(t);
  return t;
}
function videoSegment(matId, start, dur, srcIn, srcDur, speed, volume, render) {
  const sp = { ...clone(shapes.speed), id: uid(), speed };
  draft.materials.speeds.push(sp);
  const sg = clone(shapes.video_segment);
  Object.assign(sg, { id: uid(), material_id: matId, target_timerange: { start, duration: dur },
    source_timerange: { start: srcIn, duration: srcDur }, speed, volume, extra_material_refs: [sp.id], render_index: render });
  return sg;
}

const main = track('video', 'main_black_base');
main.segments.push(videoSegment(material(black, { duration: total / 1e6 + 1, width: p.width, height: p.height }), 0, total, 0, total, 1, 0, 0));
const montage = track('video', 'montage');
const handles = [];
for (const s of p.segments) {
  const start = us(s.start), dur = us(s.start + s.duration) - start;
  const srcIn = Math.round(s.in * 1e6), srcDur = Math.round(dur * s.speed);
  const sg = videoSegment(material(s.clip.path, s.clip), start, dur, srcIn, srcDur, s.speed, s.volume, 1);
  if (s.fit === 'fill') {
    const k = Math.max(p.width / s.clip.width, p.height / s.clip.height) / Math.min(p.width / s.clip.width, p.height / s.clip.height);
    sg.clip.scale = { x: k, y: k };
  }
  montage.segments.push(sg);
  handles.push({ id: s.id, before: +s.in.toFixed(2), after: +(s.clip.duration - s.in - srcDur / 1e6).toFixed(2) });
}
if (p.music) {
  const m = p.music;
  const info = JSON.parse(run(need('ffprobe'), ['-v', 'error', '-print_format', 'json', '-show_format', m.path]).stdout);
  const mdur = Math.round(Number(info.format.duration) * 1e6);
  const mat = { ...clone(shapes.audio_material), path: m.path, name: path.basename(m.path), duration: mdur };
  mat.id = mat.local_material_id = mat.music_id = uid();
  draft.materials.audios.push(mat);
  const t = { ...clone(shapes.audio_track), id: uid(), name: 'bgm', segments: [] };
  draft.tracks.push(t);
  const len = Math.min(total, mdur - Math.round(m.in * 1e6));
  const sp = { ...clone(shapes.speed), id: uid(), speed: 1 };
  draft.materials.speeds.push(sp);
  t.segments.push({ ...clone(shapes.audio_segment), id: uid(), material_id: mat.id, target_timerange: { start: 0, duration: len },
    source_timerange: { start: Math.round(m.in * 1e6), duration: len }, volume: m.volume, extra_material_refs: [sp.id], render_index: 3 });
}
if (p.captions.length) {
  const cap = p.style.caption || {};
  const t = track('text', 'captions');
  const hex = String(cap.color || '#ffffff').replace('#', '');
  const rgb = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  for (const c of p.captions) {
    const m = clone(shapes.text_material);
    m.id = uid();
    const content = JSON.parse(m.content);
    content.text = c.text;
    content.styles[0].range = [0, Array.from(c.text).length];
    content.styles[0].size = Number(cap.size || 7);
    content.styles[0].fill.content.solid.color = rgb;
    if (!cap.shadow) content.styles[0].shadows = [];
    m.content = JSON.stringify(content);
    draft.materials.texts.push(m);
    const sg = clone(shapes.text_segment);
    const start = us(c.start);
    Object.assign(sg, { id: uid(), material_id: m.id, target_timerange: { start, duration: us(c.end) - start }, extra_material_refs: [], render_index: 2 });
    sg.clip.transform = { x: 0, y: Number(cap.y ?? -0.72) };
    t.segments.push(sg);
  }
}

const prefix = `${safeName(opt.name || p.title)} - Auto Edit `;
const name = `${prefix}${nextVersion(ROOT, prefix)}`;
const dest = path.join(ROOT, name);
const tmp = path.join(ROOT, `.${name}.tmp`);
fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(tmp, { recursive: true });
const id = crypto.randomUUID().toUpperCase();
draft.id = id;
draft.name = name;
const json = JSON.stringify(draft);
fs.writeFileSync(path.join(tmp, 'draft_info.json'), json);
fs.writeFileSync(path.join(tmp, 'draft_content.json'), json);
for (const f of ['attachment_pc_common.json', 'draft_agency_config.json', 'template.tmp']) fs.copyFileSync(path.join(A, f), path.join(tmp, f));
const first = p.segments[0];
run(need('ffmpeg'), ['-nostdin', '-y', '-v', 'error', '-ss', String(first.in + 0.1), '-i', first.clip.path, '-frames:v', '1', '-vf', `${toSdr(first.clip)}scale=360:-2`, path.join(tmp, 'draft_cover.jpg')], { allowFail: true });
const meta = JSON.parse(fs.readFileSync(path.join(A, 'draft_meta_info.json'), 'utf8'));
const now = Date.now() * 1000;
Object.assign(meta, { draft_name: name, draft_fold_path: dest, draft_root_path: ROOT, draft_id: id, tm_duration: total,
  tm_draft_create: now, tm_draft_modified: now, draft_cover: fs.existsSync(path.join(tmp, 'draft_cover.jpg')) ? 'draft_cover.jpg' : '' });
fs.writeFileSync(path.join(tmp, 'draft_meta_info.json'), JSON.stringify(meta));
if (fs.existsSync(dest)) fail(`Draft already exists: ${name}`);
fs.renameSync(tmp, dest);

const missing = [...materials.keys()].filter(f => !fs.existsSync(f));
done({
  ok: missing.length === 0,
  draft: name,
  path: dest,
  duration: +(total / 1e6).toFixed(2),
  tracks: { main_black_base: 1, montage: montage.segments.length, captions: p.captions.length, bgm: p.music ? 1 : 0 },
  audio: p.audio,
  missing_media: missing,
  trim_handles_s: handles,
  next: '打开剪映专业版首页，找到这个草稿。如果剪映开着却没看到，退出剪映再打开。',
});
