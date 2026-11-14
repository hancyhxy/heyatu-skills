#!/usr/bin/env node
// Export plan.json as an MP4 first cut at full resolution, plus an SRT of the captions.
//   node render.mjs <footage> [--preview]   --preview: 540 px wide, fast, for a quick look.
// Output: <footage>/auto-edit/exports/<title> vNN.mp4 (+ .srt). Never overwrites.
import fs from 'node:fs';
import path from 'node:path';
import { SDR_TAGS, args, canDrawText, done, fail, labelFont, need, run, toSdr } from './lib.mjs';
import { loadPlan, nextVersion, safeName, srt } from './plan.mjs';

const opt = args();
const footage = opt._[0];
if (!footage) fail('Give the footage folder: node render.mjs <folder>');
const p = loadPlan(footage);
const ffmpeg = need('ffmpeg');
const scale = opt.preview ? 540 / p.width : 1;
const W = Math.round(p.width * scale / 2) * 2, H = Math.round(p.height * scale / 2) * 2;
const exportsDir = path.join(p.dir, 'exports');
fs.mkdirSync(exportsDir, { recursive: true });
const base = `${safeName(p.title)} ${opt.preview ? 'preview ' : ''}`;
const version = nextVersion(exportsDir, base);
const out = path.join(exportsDir, `${base}${version}.mp4`);
const tmp = fs.mkdtempSync(path.join(p.dir, '.render-'));
const enc = opt.preview ? ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26'] : ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18'];

try {
  const parts = p.segments.map((s, i) => {
    const part = path.join(tmp, `${String(i).padStart(4, '0')}.mp4`);
    const frame = s.fit === 'fill'
      ? `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}`
      : `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=black`;
    const speedV = `${toSdr(s.clip)}${s.speed !== 1 ? `setpts=PTS/${s.speed},` : ''}`;
    const atempo = s.speed !== 1 ? `atempo=${Math.min(2, Math.max(0.5, s.speed))},` : '';
    const src = s.out - s.in;
    const inputs = ['-ss', String(s.in), '-t', String(src), '-i', s.clip.path];
    const audio = s.clip.audio
      ? ['-filter_complex', `[0:v]${speedV}${frame},fps=${p.fps},setsar=1,format=yuv420p[v];[0:a]${atempo}volume=${s.volume},aresample=48000,aformat=channel_layouts=stereo[a]`, '-map', '[v]', '-map', '[a]']
      : ['-f', 'lavfi', '-t', String(s.duration), '-i', 'anullsrc=r=48000:cl=stereo',
        '-filter_complex', `[0:v]${speedV}${frame},fps=${p.fps},setsar=1,format=yuv420p[v]`, '-map', '[v]', '-map', '1:a'];
    run(ffmpeg, ['-nostdin', '-y', '-v', 'error', ...inputs, ...audio, '-t', String(s.duration), ...enc, ...SDR_TAGS, '-c:a', 'aac', '-b:a', '192k', part]);
    return part;
  });
  const list = path.join(tmp, 'list.txt');
  fs.writeFileSync(list, parts.map(f => `file '${f.replace(/'/g, "'\\''")}'`).join('\n'));
  const joined = p.music ? path.join(tmp, 'joined.mp4') : out;
  run(ffmpeg, ['-nostdin', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', joined]);
  if (p.music) {
    const m = p.music;
    run(ffmpeg, ['-nostdin', '-y', '-v', 'error', '-i', joined, '-ss', String(m.in), '-i', m.path,
      '-filter_complex', `[1:a]volume=${m.volume},afade=t=out:st=${Math.max(0, p.duration - 1.5)}:d=1.5[m];[0:a][m]amix=inputs=2:duration=first:normalize=0[a]`,
      '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', String(p.duration), '-movflags', '+faststart', out]);
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

fs.copyFileSync(path.join(p.dir, 'plan.json'), out.replace(/\.mp4$/, '.plan.json'));
let srtFile = null;
if (p.captions.length) {
  srtFile = out.replace(/\.mp4$/, '.srt');
  fs.writeFileSync(srtFile, srt(p.captions));
}
// Check sheet: the middle frame of each segment of the export, labelled, in timeline order.
const checkSheet = out.replace(/\.mp4$/, '.check.jpg');
{
  const vertical = p.height > p.width;
  const [cw, ch] = vertical ? [180, 320] : [320, 180];
  const cols = vertical ? Math.min(8, p.segments.length) : Math.min(5, p.segments.length);
  const font = canDrawText(ffmpeg) ? labelFont() : null;
  const tdir = fs.mkdtempSync(path.join(p.dir, '.check-'));
  p.segments.forEach((s, i) => {
    const t = s.start + s.duration / 2;
    const label = font ? `,drawtext=fontfile='${font}':text='${s.id} ${s.clip.id} ${t.toFixed(1)}s':x=6:y=h-th-6:fontsize=${Math.round(ch / 14)}:fontcolor=white:box=1:boxcolor=black@0.65:boxborderw=4` : '';
    run(ffmpeg, ['-nostdin', '-y', '-v', 'error', '-ss', String(t), '-i', out, '-frames:v', '1',
      '-vf', `scale=${cw}:${ch}:force_original_aspect_ratio=decrease,pad=${cw}:${ch}:(ow-iw)/2:(oh-ih)/2${label}`, path.join(tdir, `${String(i + 1).padStart(4, '0')}.jpg`)]);
  });
  const rows = Math.ceil(p.segments.length / cols);
  run(ffmpeg, ['-nostdin', '-y', '-v', 'error', '-framerate', '1', '-i', path.join(tdir, '%04d.jpg'),
    '-vf', `tile=${cols}x${rows}:padding=4:margin=4:color=white`, '-frames:v', '1', '-q:v', '3', checkSheet]);
  fs.rmSync(tdir, { recursive: true, force: true });
}
const check = JSON.parse(run(need('ffprobe'), ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', out]).stdout);
const v = check.streams.find(s => s.codec_type === 'video');
done({
  ok: true,
  file: out,
  srt: srtFile,
  check_sheet: checkSheet,
  duration: Number(Number(check.format.duration).toFixed(2)),
  planned: Number(p.duration.toFixed(2)),
  size: `${v.width}x${v.height}`,
  audio: check.streams.some(s => s.codec_type === 'audio'),
  segments: p.segments.length,
  music: p.music ? path.basename(p.music.path) : null,
  audio: p.audio + (p.music ? '' : ['bgm', 'bgm-only'].includes(p.audio) ? ' (no music file: drop one into the footage folder and render again, or add music in 剪映)' : ''),
  mb: Math.round(Number(check.format.size) / 1e5) / 10,
});
