#!/usr/bin/env node
// The take picker: one page with every open choice of the cut. Each option is a looping clip,
// your current pick is preselected, and the page writes one line for the user to send back.
//
//   node picker.mjs <footage>            reads auto-edit/picker.json, writes auto-edit/picker/vNN/index.html
//
// picker.json:
// { "title": "Morning run · pick the takes",
//   "slots": [
//     { "id": "S03", "name": "推肩", "hint": "推上去→放下→再推，选 1 条", "need": 1, "current": ["A"],
//       "options": [ { "clip": "c-07", "in": 68.9, "out": 72.8, "note": "低机位，完整一组" }, … ] } ] }
// Options are lettered A, B, C… in order. The line reads "推肩 A，聊天 J+B".
import fs from 'node:fs';
import path from 'node:path';
import { args, clipById, done, fail, loadClips, need, readJson, run, toSdr } from './lib.mjs';
import { nextVersion } from './plan.mjs';

const opt = args();
const footage = opt._[0];
if (!footage) fail('Usage: node picker.mjs <footage>  (reads auto-edit/picker.json)');
const { dir, clips } = loadClips(footage);
const spec = readJson(path.join(dir, 'picker.json'), null);
if (!spec || !Array.isArray(spec.slots) || !spec.slots.length) fail('picker.json is missing or has no slots.', 'See the Pick takes section of assemble.md.');
const ffmpeg = need('ffmpeg');
const encoders = run(ffmpeg, ['-hide_banner', '-encoders'], { allowFail: true }).stdout || '';
const webp = /libwebp_anim/.test(encoders);
const root = path.join(dir, 'picker');
const version = nextVersion(root, '');
const out = path.join(root, version);
fs.mkdirSync(out, { recursive: true });
const vertical = clips.orientation !== 'horizontal';
const [W, H] = vertical ? [216, 384] : [384, 216];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const problems = [];
const slots = spec.slots.map((slot, si) => {
  const id = String(slot.id || `S${String(si + 1).padStart(2, '0')}`).replace(/[^\w-]/g, '');
  const name = String(slot.name || id);
  const options = (slot.options || []).map((o, i) => {
    const letter = String.fromCharCode(65 + i);
    const clip = clipById(clips, o.clip);
    const a = Number(o.in), b = Number(o.out);
    if (!(b > a) || a < 0 || b > clip.duration + 0.05) problems.push(`${name} ${letter}: ${a}–${b}s is outside ${clip.id}`);
    const file = `${id}-${letter}.${webp ? 'webp' : 'gif'}`;
    const len = Math.min(b - a, 6);
    const vf = `${toSdr(clip)}fps=10,scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}`;
    const enc = webp ? ['-c:v', 'libwebp_anim', '-quality', '50', '-loop', '0']
      : ['-vf', `${vf},split[x][y];[x]palettegen=max_colors=96[p];[y][p]paletteuse`, '-loop', '0'];
    run(ffmpeg, ['-nostdin', '-y', '-v', 'error', '-ss', String(a), '-t', String(len), '-i', clip.path, '-an',
      ...(webp ? ['-vf', vf] : []), ...enc, path.join(out, file)]);
    return { letter, file, clip: clip.id, name: clip.name, in: a, out: b, note: String(o.note || '') };
  });
  if (options.length < 2) problems.push(`${name}: a slot needs at least two options`);
  const needN = Math.max(1, Math.min(Number(slot.need || 1), options.length));
  const current = (slot.current || ['A']).filter(l => options.some(o => o.letter === l)).slice(0, needN);
  return { id, name, hint: String(slot.hint || ''), need: needN, current, options };
});
if (problems.length) fail('picker.json has problems.', problems.join('\n'));

const sections = slots.map(s => `<section class="group" id="g-${s.id}" data-need="${s.need}" data-name="${esc(s.name)}">
<h2>${esc(s.name)} <span class="count" id="count-${s.id}"></span></h2>
${s.hint ? `<p class="hint">${esc(s.hint)}</p>` : ''}
<div class="grid">
${s.options.map(o => `<article class="card" data-group="${s.id}" data-label="${o.letter}">
  <img src="./${o.file}" alt="${esc(s.name)} ${o.letter}" width="${W}" height="${H}">
  <h3>${esc(s.name)} ${o.letter}${s.current.includes(o.letter) ? ' <span class="badge">片中现用</span>' : ''}</h3>
  <p class="meta">${esc(o.name)} · ${o.in.toFixed(2)}s · ${(o.out - o.in).toFixed(1)}s</p>
  ${o.note ? `<p class="note">${esc(o.note)}</p>` : ''}
  <div class="row"><button type="button" class="pick" aria-pressed="false">选 ${o.letter}</button><button type="button" class="zoom">放大</button></div>
</article>`).join('\n')}
</div>
</section>`).join('\n');

const template = fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'assets', 'picker.html'), 'utf8');
const title = spec.title || '选 take';
const defaults = Object.fromEntries(slots.map(s => [s.id, s.current]));
fs.writeFileSync(path.join(out, 'index.html'), template.replaceAll('{{TITLE}}', esc(title)).replace('{{SECTIONS}}', sections)
  .replace('{{DEFAULT}}', JSON.stringify(defaults)).replace('{{ASPECT}}', vertical ? '9/16' : '16/9'));
// The answer key: letters back to clip ranges, so the reply can be applied to plan.json.
fs.writeFileSync(path.join(out, 'options.json'), JSON.stringify(slots.map(s => ({ id: s.id, name: s.name, need: s.need, current: s.current,
  options: s.options.map(({ letter, clip, in: a, out: b, note }) => ({ letter, clip, in: a, out: b, note })) })), null, 1) + '\n');
done({ ok: true, page: path.join(out, 'index.html'), version, slots: slots.map(s => ({ id: s.id, name: s.name, options: s.options.length, current: s.current })),
  next: 'Give the user the page path; they reply with the line at the bottom, for example "推肩 A，聊天 J+B". Look the letters up in options.json and update plan.json.' });
