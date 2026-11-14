# Script templates

Use a template only when the user has no script, or asks for one. A user's own script always wins, and a template is a starting point the user can change line by line.

A script has two parts: a **structure** (what happens, in order) and a **sound** (what the viewer hears). Pick one of each.

## How to offer one

1. Watch the footage first (review.md), so the script uses shots that exist.
2. Choose the structure that fits the footage best, and the sound that fits the user's request (default: `bgm` when the footage has no talking, `original` when people talk on camera).
3. Fill the structure with real moments from the review: one line per beat, each with the clip and the moment you plan to use.
4. Show it in a few lines, for example:

   > 没有脚本也没关系，我按素材排了一个「一日 vlog · 带 BGM」，30 秒：
   > 1. 开场：落地窗前喝咖啡（c-04）
   > 2. 早上：出门、等电梯（c-01、c-02）
   > …
   > 可以就说「可以」，想改哪句直接说；也可以换成别的模板，或者你自己说脚本。

Completion: the user has confirmed the script, changed or not.

## Structures

| Template | Beats | Length | Pace |
|---|---|---|---|
| 一日 vlog | Hook (the best-looking shot of the day) → morning → 2–3 moments of the day → a closing line or shot | 30–60 s | 1–2 s a shot; hold 3–4 s on a scene that breathes |
| 旅行 / 出门 | Leaving → on the way → arrival, wide → 3–5 details → closing | 20–45 s | 1–1.5 s; the arrival wide shot 2–3 s |
| 好物 / 种草 | Result first → the problem → unboxing and close-ups → in use → before and after → call to action | 20–40 s | 0.8–1.5 s; product close-ups short, the result shot longest |
| 健身训练 | Arriving → one block per exercise (caption: its name, sets × reps) → after the workout → closing | 30–60 s | 2–4 s per exercise: a full rep, cut on the top of the movement |
| 混剪卡点 | No story: the best shots in a rising order, ending on the strongest | 10–20 s | 0.4–1 s, every cut on the beat of the music |

Captions: short, one line, in the user's voice. A hook caption in the first second; a closing line at the end. No captions on 混剪卡点 unless asked.

## Sounds

Set `audio` in plan.json (assemble.md).

| Sound | `audio` | What the viewer hears | Notes |
|---|---|---|---|
| 带 BGM | `bgm` | Music under the clips' own sound | Keep shots where people talk to camera whole |
| 纯 BGM | `bgm-only` | Music only; the clips are muted | Cut to the beat; best for 混剪卡点 and travel |
| 原声 | `original` | The clips' own sound only | For moments where the sound matters |
| 后配口播 | `voiceover` | A voice-over the user records later, low music under it | Write the voice-over text as the script, one line per beat. Pace the picture at 5 Chinese characters (or 2.5 English words) a second, so each beat lasts as long as its line. The lines become the captions; the user records the voice in 剪映 (录音) over the draft |

Music: the Skill ships no music. The user drops a music file they have the right to use (mp3, m4a, wav…) into the footage folder; `scan.mjs` lists it under `music`, and with one file it is used without asking. With several, ask which one (or which for which part) and set `music.file`. With none and a music sound, ask: "把要用的音乐文件拖进素材文件夹就行；没有的话也可以先出片，之后在剪映里加。" Talking to camera (同期口播) needs hearing the words; tell the user the cut follows the picture, and to check that no sentence is cut short.
