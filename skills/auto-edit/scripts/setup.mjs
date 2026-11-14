#!/usr/bin/env node
// Ready the Mac for Auto Edit: FFmpeg and ffprobe, the 剪映 draft folder, the saved style.
// Usage: node setup.mjs [--check]
//   --check  report only; download nothing.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { BIN_DIR, CONFIG_PATH, SKILL_DIR, args, canDrawText, done, fail, readJson, tool } from './lib.mjs';

const opt = args();
const TOOLS = readJson(path.join(SKILL_DIR, 'scripts', 'tools.json'), {});
const arch = process.arch === 'arm64' ? 'arm64' : 'amd64';
const report = { ok: true, node: process.version, arch };

if (process.platform !== 'darwin') fail('Auto Edit runs on macOS.');
if (Number(process.versions.node.split('.')[0]) < 20) fail(`Node ${process.version} is too old; Node 20 or later is needed.`);

async function fetchTo(url, file) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(file, buf);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function signedBy(file, team) {
  const r = spawnSync('/usr/bin/codesign', ['-dv', '--verbose=2', file], { encoding: 'utf8' });
  return new RegExp(`TeamIdentifier=${team}\\b`).test(r.stderr || '')
    && spawnSync('/usr/bin/codesign', ['--verify', file]).status === 0;
}

/** Download one tool: the pinned copy on heyatu.com (SHA-256), else the signed upstream build. */
async function install(name) {
  const entry = (TOOLS[name] || {})[arch];
  if (!entry) throw new Error(`No ${name} download for ${arch}.`);
  fs.mkdirSync(BIN_DIR, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'auto-edit-'));
  const zip = path.join(tmp, `${name}.zip`);
  const errors = [];
  for (const src of entry.sources) {
    try {
      const sum = await fetchTo(src.url, zip);
      if (src.sha256 && sum !== src.sha256) throw new Error(`checksum mismatch from ${src.url}`);
      const out = path.join(tmp, 'x');
      fs.rmSync(out, { recursive: true, force: true });
      if (spawnSync('/usr/bin/ditto', ['-x', '-k', zip, out]).status !== 0) throw new Error('cannot unzip');
      const bin = path.join(out, name);
      if (!fs.existsSync(bin)) throw new Error(`${name} not in the zip`);
      if (!src.sha256 && !signedBy(bin, entry.team)) throw new Error(`signature check failed for ${src.url}`);
      fs.chmodSync(bin, 0o755);
      fs.copyFileSync(bin, path.join(BIN_DIR, name));
      fs.chmodSync(path.join(BIN_DIR, name), 0o755);
      fs.rmSync(tmp, { recursive: true, force: true });
      return src.url;
    } catch (e) { errors.push(e.message); }
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  throw new Error(errors.join('; '));
}

for (const name of ['ffmpeg', 'ffprobe']) {
  let found = tool(name);
  // The contact sheets need drawtext; a system ffmpeg without it gets the Skill's own copy.
  const weak = name === 'ffmpeg' && found && !found.startsWith(BIN_DIR) && !canDrawText(found);
  if (weak) report.ffmpeg_without_drawtext = found;
  if ((!found || weak) && !opt.check) {
    try { report[`${name}_downloaded_from`] = await install(name); found = tool(name); }
    catch (e) { fail(`Cannot download ${name}: ${e.message}`, 'Check the network, then run setup.mjs again.'); }
  }
  report[name] = found || null;
  if (!found) report.ok = false;
}

// 剪映专业版 (Mac): the app and its draft folder. Optional; without it Auto Edit still exports MP4.
const app = ['/Applications/VideoFusion-macOS.app', path.join(os.homedir(), 'Applications/VideoFusion-macOS.app')].find(p => fs.existsSync(p));
const draftRoot = path.join(os.homedir(), 'Movies/JianyingPro/User Data/Projects/com.lveditor.draft');
let appVersion = null;
if (app) {
  const r = spawnSync('/usr/bin/defaults', ['read', path.join(app, 'Contents/Info'), 'CFBundleShortVersionString'], { encoding: 'utf8' });
  appVersion = (r.stdout || '').trim() || null;
}
report.jianying = { installed: !!app, version: appVersion, draft_root: fs.existsSync(draftRoot) ? draftRoot : null };

const config = readJson(CONFIG_PATH, null);
report.style = config ? { saved: true, path: CONFIG_PATH } : { saved: false, path: CONFIG_PATH };
done(report, report.ok ? 0 : 1);
