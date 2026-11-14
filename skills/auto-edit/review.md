# Watch every clip

The aim is a written log of what is in the footage, so that you can pick shots by meaning and the user can ask "where is the shot where I…" later.

## Sheets

```sh
node scripts/scan.mjs "<footage>"
```

It lists the clips in `auto-edit/clips.json` (id `c-01`, `c-02`… stays the same on later runs), skips exact duplicates and unreadable files, and draws contact sheets: one frame per second (long clips are spread to 40 frames), each labelled `<clip id> <seconds>`. Look at every sheet in `sheets` of the result, in order; the `clips` list of each sheet says which clips it covers.

For a stretch that needs a closer look (where an action starts, which of two takes is cleaner, a quick gesture):

```sh
node scripts/scan.mjs "<footage>" --clip c-07 --from 4 --to 7 --fps 6
```

Use detail sheets only where a boundary matters; the 1-second sheets are enough to understand the footage.

## The log

Write `auto-edit/review.md`: one section per clip, its stretches in time order, covering the clip from start to end.

```markdown
## c-03 IMG_4521.MOV (12.4 s, vertical, sound)
- 0.0–2.5 holding the camera, walking to the café door (setup, unusable)
- 2.5–7.0 opens the door, smiles to camera; take 1
- 7.0–11.5 same action, cleaner; take 2 ★
- 11.5–12.4 camera lowered (end)
```

For each stretch: times, what is visible, framing (close / medium / wide, selfie, top-down), and notes that affect the choice: repeated take, shaky, out of focus, someone talking, private information on screen. Mark the best take of a repeated action with ★ and keep every other complete take in the log: they are the options of the take picker. Describe what you see; take names and places from the user, not from guesses.

Completion: every clip in `clips.json` has a section, and each section covers its full length.
