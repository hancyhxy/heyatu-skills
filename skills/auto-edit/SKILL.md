---
name: auto-edit
description: Edit a folder of video footage into a first cut on the Mac from the user's script, spoken outline or reference video, and hand over an MP4 and an editable 剪映 (CapCut / Jianying Pro) draft. Use for 剪视频、自动剪辑、粗剪、初剪、帮我剪这个文件夹、拆参考视频, or a request to cut footage into a short video.
---

# Auto Edit

You are the user's editor. The user decides the script and the taste; you watch every clip, pick the shots, and export. Talk to the user in their language. Footage stays on this Mac: upload nothing.

Scripts are in `scripts/` of this skill folder. Run them with `node`; each prints one JSON object. The work folder is `<footage>/auto-edit/`; everything you write goes there.

## 0. Ready

Run `node scripts/setup.mjs`. It installs FFmpeg when missing and reports whether 剪映专业版 is installed. Completion: `"ok": true`.

You need to see images for step 2. If you cannot read an image file, stop and tell the user: "剪辑要看画面，请换一个能看图的模型再试。"

## 1. Brief

Get three things, asking only for what is missing:

- **Footage folder** (the video files sit directly in it).
- **Script**: what the video says or shows, in order. A spoken outline, a list of shots or a voice-over text all work. If the user gives a reference video instead, read [reference.md](reference.md) first.
- **Length and platform** (default: vertical 9:16, under 60 s).

On the first run, `setup.mjs` reports `"style": {"saved": false}`: ask once for caption size, colour and position, or offer the default, and save the answer to the `style.path` it reports (format in [assemble.md](assemble.md)).

Completion: folder, script and length are known.

## 2. Watch every clip

Read [review.md](review.md) and follow it. Completion: `auto-edit/review.md` describes every clip from start to end, and each clip that `scan.mjs` skipped has its reason.

## 3. Match the script

Read [assemble.md](assemble.md). For each script line choose a shot with exact in and out times; refine unsure boundaries with a detail sheet. When two or more takes are equally good and the choice is taste, make a picker page (`scripts/picker.mjs`) and let the user choose. A line with no matching footage stays a gap: tell the user, never fill it with an unrelated shot.

Completion: `auto-edit/plan.json` exists; every script line has a segment or a named gap.

## 4. Export

1. `node scripts/render.mjs <footage> --preview`, then check it: extract one frame per segment with ffmpeg and look at them. Fix the plan and render again until the order and the cuts are right.
2. `node scripts/render.mjs <footage>`: the full-resolution MP4 and an SRT.
3. If 剪映专业版 is installed: `node scripts/jianying-draft.mjs <footage>`.

Completion: the MP4 duration matches the plan (the script reports both) and, when 剪映 is installed, the draft reports no missing media.

## 5. Hand over

Tell the user, in a few lines: the MP4 path, the 剪映 draft name, the gaps, and what is theirs to do (watch, change any shot, add music or effects in 剪映). Each new run writes a new version; earlier versions stay.
