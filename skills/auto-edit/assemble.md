# Match the script and export

## plan.json

Write `<footage>/auto-edit/plan.json`. Segments play in order with no gaps; times are seconds in the original clip.

```json
{
 "title": "Morning run",
 "segments": [
  { "clip": "c-03", "in": 7.2, "out": 9.0, "caption": "早上六点", "line": "Opening: leaving home" },
  { "clip": "c-07", "in": 1.0, "out": 2.4, "speed": 1.5 },
  { "clip": "c-11", "in": 3.5, "out": 6.0, "volume": 0, "caption": "第一公里" }
 ],
 "audio": "bgm",
 "music": { "file": "song.mp3", "in": 12 }
}
```

| Field | Meaning |
|---|---|
| `clip`, `in`, `out` | Clip id from `clips.json` and the part of it to use |
| `caption` | Text shown while this segment plays (optional) |
| `line` | The script line it serves; keeps the plan readable |
| `speed` | 1 by default; 0.5–2 |
| `volume` | The clip's sound: 1 keeps it, 0 mutes it; the default comes from `audio` |
| `fit` | `fill` (crop to the frame, default when the orientation matches) or `fit` (black bars) |
| `canvas`, `fps` | Optional; default 9:16 or 16:9 from the footage, 1080p at most, 30 fps |
| `audio` | `original`, `bgm` (music under the clips' sound), `bgm-only` (clips muted) or `voiceover` (see templates.md). Sets the default clip and music volume |
| `music` | `{ "file", "in", "volume" }`: `file` is a music file the user dropped into the footage folder (`clips.json` → `music`); `in` skips the intro. Leave it out when the folder has exactly one music file: it is used. In the MP4 and on a `bgm` track of the 剪映 draft |

## Choosing shots

- Follow the script order; one script line can use one or several shots.
- Cut on action: start a shot just before the movement that matters, end it once the point is made. 0.8–2.5 s per shot suits most short videos; hold longer when someone talks to camera.
- Prefer the ★ take of a repeated action. Skip setup and camera-lowering moments.
- Spoken lines: keep the whole sentence; cut at a pause.
- Unsure boundary: make a detail sheet (`review.md`) before you decide.
- Note the other usable takes of each line as you go; they become the picker options.

## Pick takes

Write `auto-edit/picker.json` with one slot per line that has two or more usable takes, then run `node scripts/picker.mjs <footage>`.

```json
{
 "title": "Morning run · 选 take",
 "slots": [
  { "id": "S03", "name": "推肩", "hint": "推上去→放下→再推，选 1 条", "need": 1, "current": ["A"],
    "options": [
     { "clip": "c-07", "in": 68.9, "out": 72.8, "note": "低机位，完整一组（片中现用）" },
     { "clip": "c-07", "in": 71.3, "out": 75.5, "note": "同组下一次" },
     { "clip": "c-12", "in": 46.5, "out": 50.9, "note": "白 T，换了衣服" } ] },
  { "id": "S09", "name": "聊天", "hint": "和朋友聊天，选 2 条，按点选顺序放进片中", "need": 2, "current": ["A", "B"], "options": [ … ] }
 ]
}
```

- `name` is how the user calls the moment (the script's words), short: it appears in the reply.
- Options are lettered A, B, C… in order; put your pick first and list it in `current`, so the page opens preselected (blue "片中现用").
- `hint` says what to look for; `need` is how many to pick; `note` is what differs (angle, clothes, a stumble).
- 2–8 options a slot; up to 10 slots a page.

The page (`picker/vNN/index.html`) shows looping low-res clips with 选 and 放大, and a line at the bottom such as `推肩 C，聊天 J+B`. Give the user the page path: Hey Atu opens it in the preview pane beside the chat and on the phone. In another agent (a terminal), also run `open "<page>"` so it opens in the browser. When the reply comes, look the letters up in `picker/vNN/options.json`, set those clips and times in `plan.json` (for `need` > 1, in the picked order), and confirm in one line what changed.

## Style

The caption style is saved in the file that `setup.mjs` names (`~/.config/heyatu/auto-edit.json`) and applies to every edit:

```json
{ "caption": { "size": 7, "color": "#ffffff", "y": -0.72, "shadow": true } }
```

`size` is the 剪映 text size (5 small – 12 large); `y` runs from -1 (bottom) to 1 (top). A `style` object in `plan.json` overrides it for one edit.

## Scripts

- `render.mjs <footage> [--preview]`: MP4 (+ SRT when there are captions) in `auto-edit/exports/`, with a copy of the plan it used (`… vNN.plan.json`). The MP4 has no burnt-in captions; the SRT and the 剪映 draft carry them.
- `jianying-draft.mjs <footage> [--name "…"]`: a new draft in 剪映专业版: black base on the main track, the cut on the track above with the full original clips (trim handles in `trim_handles_s`), captions on a text track. If 剪映 is open and the draft does not show, the user quits and reopens 剪映.
