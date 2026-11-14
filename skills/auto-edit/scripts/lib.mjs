// Shared helpers of the Auto Edit scripts. Node 20+, no npm packages.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const BIN_DIR = path.join(SKILL_DIR, 'bin');
export const VIDEO_EXT = new Set(['.mov', '.mp4', '.m4v', '.mkv', '.avi', '.mts', '.m2ts', '.3gp', '.webm', '.hevc']);
export const AUDIO_EXT = new Set(['.mp3', '.m4a', '.wav', '.aac', '.flac', '.aiff', '.aif', '.ogg']);
export const CONFIG_PATH = path.join(os.homedir(), '.config', 'heyatu', 'auto-edit.json');

/** Print one JSON result and exit. Every script ends here, so Atu reads one object. */
export function done(data, code = 0) {
  process.stdout.write(JSON.stringify(data, null, 1) + '\n');
  process.exit(code);
}

export function fail(message, hint = '') {
  done({ ok: false, error: message, ...(hint ? { hint } : {}) }, 1);
}

/** --key value and --flag arguments; the rest are positional. */
export function args(argv = process.argv.slice(2)) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) out[key] = true;
      else { out[key] = next; i++; }
    } else out._.push(a);
  }
  return out;
}

/** The ffmpeg or ffprobe binary: the copy setup.mjs installed, then PATH, then Homebrew. */
export function tool(name) {
  const candidates = [path.join(BIN_DIR, name), `/opt/homebrew/bin/${name}`, `/usr/local/bin/${name}`];
  for (const dir of (process.env.PATH || '').split(':')) if (dir) candidates.push(path.join(dir, name));
  for (const c of candidates) {
    try { fs.accessSync(c, fs.constants.X_OK); return c; } catch {}
  }
  return null;
}

export function need(name) {
  const t = tool(name);
  if (!t) fail(`${name} is missing.`, `Run: node "${path.join(SKILL_DIR, 'scripts/setup.mjs')}"`);
  return t;
}

export function run(cmd, argv, opts = {}) {
  const r = spawnSync(cmd, argv, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, ...opts });
  if (r.error) throw r.error;
  if (r.status !== 0 && !opts.allowFail) {
    const tail = (r.stderr || '').trim().split('\n').slice(-6).join('\n');
    throw new Error(`${path.basename(cmd)} failed (${r.status}): ${tail}`);
  }
  return r;
}

/** Duration, size, rotation-corrected display size, fps, audio and capture time of one file. */
export function probe(file) {
  const r = run(need('ffprobe'), ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file], { allowFail: true });
  if (r.status !== 0) return { ok: false, error: (r.stderr || '').trim().split('\n').pop() };
  const j = JSON.parse(r.stdout);
  const v = (j.streams || []).find(s => s.codec_type === 'video' && !(s.disposition && s.disposition.attached_pic));
  const a = (j.streams || []).find(s => s.codec_type === 'audio');
  if (!v) return { ok: false, error: 'no video stream' };
  let rotation = 0;
  for (const sd of v.side_data_list || []) if (sd.rotation !== undefined) rotation = Number(sd.rotation);
  if (!rotation && v.tags && v.tags.rotate) rotation = Number(v.tags.rotate);
  const turned = Math.abs(rotation) % 180 === 90;
  const [n, d] = String(v.avg_frame_rate || v.r_frame_rate || '30/1').split('/').map(Number);
  const fps = d ? n / d : n;
  const tags = { ...(j.format.tags || {}), ...(v.tags || {}) };
  const created = tags['com.apple.quicktime.creationdate'] || tags.creation_time || null;
  return {
    ok: true,
    duration: Number(j.format.duration || v.duration || 0),
    width: turned ? v.height : v.width,
    height: turned ? v.width : v.height,
    stored: { width: v.width, height: v.height, rotation },
    fps: Math.round(fps * 1000) / 1000,
    codec: v.codec_name,
    audio: !!a,
    transfer: v.color_transfer || 'unknown',
    hdr: ['arib-std-b67', 'smpte2084'].includes(v.color_transfer),
    created,
    bytes: Number(j.format.size || 0),
  };
}

/** Video files directly in a folder, sorted by name. Skips the work folder and hidden files. */
export function listVideos(folder) {
  return fs.readdirSync(folder, { withFileTypes: true })
    .filter(e => e.isFile() && !e.name.startsWith('.') && VIDEO_EXT.has(path.extname(e.name).toLowerCase()))
    .map(e => path.join(folder, e.name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

/** Music files directly in a folder (the user drops them in beside the footage), sorted by name. */
export function listAudio(folder) {
  return fs.readdirSync(folder, { withFileTypes: true })
    .filter(e => e.isFile() && !e.name.startsWith('.') && AUDIO_EXT.has(path.extname(e.name).toLowerCase()))
    .map(e => path.join(folder, e.name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export function workDir(footage) {
  const dir = path.join(path.resolve(footage), 'auto-edit');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

export function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 1) + '\n');
}

/** The work folder of a footage folder, with its clips.json (written by scan.mjs). */
export function loadClips(footage) {
  const dir = workDir(footage);
  const clips = readJson(path.join(dir, 'clips.json'), null);
  if (!clips) fail('clips.json is missing.', `Run scan.mjs on "${footage}" first.`);
  return { dir, clips };
}

export function clipById(clips, id) {
  const c = clips.clips.find(x => x.id === id);
  if (!c) fail(`Unknown clip: ${id}`);
  return c;
}

export const hms = s => {
  const t = Math.max(0, s);
  const m = Math.floor(t / 60);
  const sec = t - m * 60;
  return `${String(m).padStart(2, '0')}:${sec.toFixed(1).padStart(4, '0')}`;
};

/** Whether this ffmpeg can draw text (Homebrew's default build cannot). */
export function canDrawText(ffmpeg) {
  const r = run(ffmpeg, ['-hide_banner', '-filters'], { allowFail: true });
  return / drawtext /.test(r.stdout || '');
}

/** Labels on contact sheets and WebP loops on the picker page both work. */
export function fullFfmpeg(ffmpeg) {
  const r = run(ffmpeg, ['-hide_banner', '-encoders'], { allowFail: true });
  const f = run(ffmpeg, ['-hide_banner', '-filters'], { allowFail: true }).stdout || '';
  return canDrawText(ffmpeg) && /libwebp_anim/.test(r.stdout || '') && / zscale /.test(f) && / tonemap /.test(f);
}

/**
 * Filters that turn an HDR clip (iPhone HLG or Dolby Vision, PQ) into SDR Rec.709 before any other filter.
 * Without them the picture looks grey and flat. Hable is the closest to Apple's own conversion (checked 2026-11-14).
 */
export function toSdr(clip) {
  return clip && clip.hdr
    ? 'zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p,'
    : '';
}

/** Rec.709 tags for every encoded output. */
export const SDR_TAGS = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709'];

/** A font file for labels on contact sheets (system fonts on macOS). */
export function labelFont() {
  for (const f of ['/System/Library/Fonts/Supplemental/Arial Bold.ttf', '/System/Library/Fonts/Supplemental/Arial.ttf',
    '/System/Library/Fonts/Helvetica.ttc', '/Library/Fonts/Arial.ttf']) if (fs.existsSync(f)) return f;
  return null;
}

/** Escape a path or text for an ffmpeg filter argument. */
export const fesc = s => String(s).replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'").replace(/,/g, '\\,');
