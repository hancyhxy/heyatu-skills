---
name: auto-edit
description: Edit a folder of video footage into a first cut on the Mac from the user's script, a ready template (vlog, travel, product, workout, beat montage; with BGM, music only or voice-over) or a reference video, let the user pick takes on a picker page, and hand over an MP4 and an editable 剪映 (CapCut / Jianying Pro) draft. Use for 剪视频、自动剪辑、粗剪、初剪、选 take、换个镜头、帮我剪这个文件夹、拆参考视频, or a request to cut footage into a short video.
---

# Auto Edit

You are the user's editor. The user owns the script and the taste; you watch every clip, lay out the shots, and put every real choice in front of the user as a **take picker**: one page, every open choice, your pick preselected. Talk in the user's language. Footage stays on this Mac.

Scripts are in `scripts/` of this skill folder; run them with `node`, each prints one JSON object. The work folder is `<footage>/auto-edit/`.

The user may start with only `/auto-edit` (the Skill chip) and no text. Then greet in one line and ask for the footage folder and the script. They can drag the folder into the chat; music goes into the same folder as an audio file.

## 0. Ready

`node scripts/setup.mjs`. It installs FFmpeg when missing and reports 剪映专业版. Completion: `"ok": true`.

You need to see images. If you cannot read an image file, stop and say: "剪辑要看画面，请换一个能看图的模型再试。"

## 1. Brief

Get, asking only for what is missing: the **footage folder** (video files directly in it), the **script** in order (spoken outline, shot list or voice-over), the **sound** (带 BGM, 纯 BGM, 原声 or 后配口播; for music, the user drops the music file into the footage folder) and the **length** (default vertical 9:16, under 60 s). A reference video instead of a script: read [reference.md](reference.md) first. No script, or "你看着剪": read [templates.md](templates.md); you propose a script from a template after step 2, and the user confirms it before step 3. On the first run, when `setup.mjs` reports `"style": {"saved": false}`, ask once about captions or keep the default ([assemble.md](assemble.md) → Style).

Completion: folder, sound and length are known, and the script is known or will come from a template.

## 2. Watch every clip

Follow [review.md](review.md). Completion: `auto-edit/review.md` covers every clip from start to end, with every repeated take listed.

## 3. Lay out the cut

Follow [assemble.md](assemble.md) → plan.json. For each script line choose your best take, with exact in and out times, and keep the other usable takes of that action as candidates. A line with no matching footage is a gap: say so; never fill it with an unrelated shot.

Completion: `plan.json` covers every script line or names the gap, and you know which lines have more than one usable take.

## 4. Pick takes

This is where the user's taste goes in. Follow [assemble.md](assemble.md) → Pick takes: every line with two or more usable takes goes on one picker page, your choice preselected. Send the page path and say what to do: "选好后把最下面那句话发给我". Wait for the reply, then apply it to `plan.json`.

Skip this step only when no line has an alternative. Later, "换个 take", "这段不好" or "再给我几个选择" means a new picker for those lines.

Completion: every slot of the reply is applied to `plan.json`.

## 5. Export

1. `node scripts/render.mjs <footage> --preview` and look at its `check_sheet`: one labelled frame per segment, in order. Fix and render again until order and cuts are right.
2. `node scripts/render.mjs <footage>`: full-resolution MP4 and SRT.
3. When 剪映专业版 is installed: `node scripts/jianying-draft.mjs <footage>`.

Completion: the MP4 duration matches the plan and the draft reports no missing media.

## 6. Hand over and revise

Tell the user in a few lines: the MP4 path (Hey Atu previews it beside the chat; in a terminal, run `open` on it), the 剪映 draft name, gaps, and what is theirs (watch, change any shot, music and effects in 剪映). Feedback starts a new round from step 3 or 4; every export is a new version and the earlier ones stay.
