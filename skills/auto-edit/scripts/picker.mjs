#!/usr/bin/env node
// A page for the user to choose between takes: one short preview per option, lettered A, B, C…
//   node picker.mjs <footage> --slot S03 --title "Opening line" --options "c-02:26.3-27.6,c-14:3.0-5.2,c-15:10-12"
// Output: <footage>/auto-edit/picker/<slot>/index.html (opens on the Mac and in Hey Atu on the phone).
import fs from 'node:fs';
import path from 'node:path';
import { args, clipById, done, fail, loadClips, need, run } from './lib.mjs';

const opt = args();
const footage = opt._[0];
if (!footage || !opt.slot || !opt.options) fail('Usage: node picker.mjs <folder> --slot S03 --options "c-02:26.3-27.6,c-14:3-5"');
const { dir, clips } = loadClips(footage);
const slot = String(opt.slot).replace(/[^\w-]/g, '');
const out = path.join(dir, 'picker', slot);
fs.mkdirSync(out, { recursive: true });
const ffmpeg = need('ffmpeg');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const options = String(opt.options).split(',').map((o, i) => {
  const m = o.trim().match(/^([\w-]+):([\d.]+)-([\d.]+)$/);
  if (!m) fail(`Bad option: ${o}`, 'Write each option as clip:in-out, for example c-02:26.3-27.6');
  const clip = clipById(clips, m[1]);
  const letter = String.fromCharCode(65 + i);
  const file = `${letter}.mp4`;
  run(ffmpeg, ['-nostdin', '-y', '-v', 'error', '-ss', m[2], '-t', String(Number(m[3]) - Number(m[2])), '-i', clip.path,
    '-vf', 'scale=480:480:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28',
    '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', path.join(out, file)]);
  return { letter, file, clip: clip.id, name: clip.name, in: Number(m[2]), out: Number(m[3]) };
});

const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(opt.title || slot)} · 选片</title><style>
body{margin:0;font:15px/1.5 -apple-system,"PingFang SC",sans-serif;background:#fffdf9;color:#1d1a17;padding:20px}
h1{font-size:20px;margin:0 0 4px}p{margin:0 0 16px;color:#7a7168}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}
.c{border:1px solid rgba(60,40,20,.16);border-radius:14px;overflow:hidden;background:#fff}
.c video{width:100%;display:block;background:#000;max-height:60vh}
.c div{padding:10px 12px}.c b{font-size:22px;margin-right:8px}.c small{color:#7a7168}
</style></head><body><h1>${esc(opt.title || slot)}</h1><p>看完告诉阿图选哪个，比如「${slot} 选 B」。</p><div class="g">
${options.map(o => `<div class="c"><video src="${o.file}" controls playsinline loop preload="metadata"></video><div><b>${o.letter}</b><small>${esc(o.name)} · ${o.in.toFixed(1)}–${o.out.toFixed(1)}s</small></div></div>`).join('\n')}
</div></body></html>`;
fs.writeFileSync(path.join(out, 'index.html'), html);
done({ ok: true, page: path.join(out, 'index.html'), options });
