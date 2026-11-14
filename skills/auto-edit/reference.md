# Break down a reference video

The user gives a video they like (a local file or a screen recording) and wants the same structure with their own footage.

1. Put the reference in its own folder (not the footage folder) and run `node scripts/scan.mjs "<reference folder>" --every 0.5`. For fast cuts, run a detail sheet at 4–6 fps over each part.
2. Write `auto-edit/reference.md` in the footage folder as a shot table:

   | # | Time | Length | Picture | Text on screen | Voice / sound |
   |---|---|---|---|---|---|
   | 1 | 0.0–1.2 | 1.2 s | Close-up of coffee being poured, top-down | "6 AM" | Music starts |

   Then three lines: the structure (hook → middle → ending), the pace (average shot length) and what makes it work.
3. Turn it into the script for this edit: one line per shot, in the user's words, and confirm it with the user before step 2 of the main skill.

Use the reference for structure and pace only. Its pictures and words belong to its author: the cut uses the user's own footage.

Completion: the user has confirmed a script derived from the reference.
