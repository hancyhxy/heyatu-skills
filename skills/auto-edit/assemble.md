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
 "music": { "path": "/Users/me/Music/song.mp3", "in": 12, "volume": 0.25 }
}
```

| Field | Meaning |
|---|---|
| `clip`, `in`, `out` | Clip id from `clips.json` and the part of it to use |
| `caption` | Text shown while this segment plays (optional) |
| `line` | The script line it serves; keeps the plan readable |
| `speed` | 1 by default; 0.5–2 |
| `volume` | 1 keeps the clip's sound, 0 mutes it |
| `fit` | `fill` (crop to the frame, default when the orientation matches) or `fit` (black bars) |
| `canvas`, `fps` | Optional; default 9:16 or 16:9 from the footage, 1080p at most, 30 fps |
| `music` | Optional; mixed under the clips in the MP4. The 剪映 draft leaves music to the user |

## Choosing shots

- Follow the script order; one script line can use one or several shots.
- Cut on action: start a shot just before the movement that matters, end it once the point is made. 0.8–2.5 s per shot suits most short videos; hold longer when someone talks to camera.
- Prefer the ★ take of a repeated action. Skip setup and camera-lowering moments.
- Spoken lines: keep the whole sentence; cut at a pause.
- Unsure boundary: make a detail sheet (`review.md`) before you decide.
- Taste choices: `node scripts/picker.mjs <footage> --slot S03 --title "…" --options "c-02:26.3-27.6,c-14:3.0-5.2"` makes a page of lettered previews; give the user the `page` path and wait for the answer.

## Style

The caption style is saved in the file that `setup.mjs` names (`~/.config/heyatu/auto-edit.json`) and applies to every edit:

```json
{ "caption": { "size": 7, "color": "#ffffff", "y": -0.72, "shadow": true } }
```

`size` is the 剪映 text size (5 small – 12 large); `y` runs from -1 (bottom) to 1 (top). A `style` object in `plan.json` overrides it for one edit.

## Scripts

- `render.mjs <footage> [--preview]`: MP4 (+ SRT when there are captions) in `auto-edit/exports/`. The MP4 has no burnt-in captions; the SRT and the 剪映 draft carry them.
- `jianying-draft.mjs <footage> [--name "…"]`: a new draft in 剪映专业版: black base on the main track, the cut on the track above with the full original clips (trim handles in `trim_handles_s`), captions on a text track. If 剪映 is open and the draft does not show, the user quits and reopens 剪映.
