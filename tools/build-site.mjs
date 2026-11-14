#!/usr/bin/env node
// Build the files that heyatu.com serves for every Skill in skills/.
//
//   node tools/build-site.mjs [--out dist]
//
// dist/
// ├── .well-known/agent-skills/index.json        Agent Skills Discovery index (npx skills add https://heyatu.com)
// ├── .well-known/agent-skills/<name>/…           the files of each Skill
// ├── .well-known/skills/index.json               the same index at the older address
// └── skills/<name>/install.md, skills/<name>.zip  the "Copy to Atu" route; the zip goes to R2
//
// Files listed in .skillignore and bin/ folders are left out.
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const outAt = argv.indexOf('--out');
const OUT = path.resolve(outAt >= 0 ? argv[outAt + 1] : path.join(ROOT, 'dist'));
const SITE = 'https://heyatu.com';
const SKIP = new Set(['bin', 'node_modules', '.DS_Store']);

function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const out = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

function files(dir, base = dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (SKIP.has(e.name) || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...files(p, base));
    else out.push(path.relative(base, p));
  }
  return out;
}

fs.rmSync(OUT, { recursive: true, force: true });
const index = { skills: [] };
const report = [];
for (const name of fs.readdirSync(path.join(ROOT, 'skills')).sort()) {
  const dir = path.join(ROOT, 'skills', name);
  if (!fs.existsSync(path.join(dir, 'SKILL.md'))) continue;
  const fm = frontmatter(fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8'));
  if (fm.name !== name) throw new Error(`skills/${name}/SKILL.md: name must be "${name}"`);
  if (!fm.description) throw new Error(`skills/${name}/SKILL.md: description is missing`);
  const list = files(dir);
  for (const f of list) {
    const to = path.join(OUT, '.well-known/agent-skills', name, f);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(path.join(dir, f), to);
  }
  index.skills.push({ name, description: fm.description, files: list });

  const zipDir = path.join(OUT, 'skills');
  fs.mkdirSync(zipDir, { recursive: true });
  const zip = path.join(zipDir, `${name}.zip`);
  const stage = fs.mkdtempSync(path.join(OUT, '.zip-'));
  for (const f of list) {
    const to = path.join(stage, name, f);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(path.join(dir, f), to);
  }
  execFileSync('/usr/bin/ditto', ['-c', '-k', '--keepParent', path.join(stage, name), zip]);
  fs.rmSync(stage, { recursive: true, force: true });
  const sha = crypto.createHash('sha256').update(fs.readFileSync(zip)).digest('hex');

  const install = fs.readFileSync(path.join(ROOT, 'tools', 'install.template.md'), 'utf8')
    .replaceAll('{{name}}', name).replaceAll('{{site}}', SITE).replaceAll('{{sha256}}', sha)
    .replaceAll('{{description}}', fm.description);
  fs.mkdirSync(path.join(zipDir, name), { recursive: true });
  fs.writeFileSync(path.join(zipDir, name, 'install.md'), install);
  report.push({ name, files: list.length, zip: path.relative(OUT, zip), sha256: sha, kb: Math.round(fs.statSync(zip).size / 1024) });
}
for (const p of ['.well-known/agent-skills/index.json', '.well-known/skills/index.json']) {
  fs.mkdirSync(path.dirname(path.join(OUT, p)), { recursive: true });
  fs.writeFileSync(path.join(OUT, p), JSON.stringify(index, null, 1) + '\n');
}
console.log(JSON.stringify({ ok: true, out: OUT, skills: report }, null, 1));
