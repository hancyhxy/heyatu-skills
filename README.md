# Hey Atu Skills

Free Skills from [Hey Atu](https://heyatu.com), in the open [Agent Skills](https://agentskills.io) format. They are written for Atu on your Mac, and work in other agents that read `SKILL.md` (Claude Code, Codex, Cursor and more).

| Skill | What it does |
|---|---|
| [auto-edit](skills/auto-edit/) | Give it a folder of footage and your script; it watches every clip, picks the shots and exports a first cut as an MP4 and an editable 剪映 (CapCut / Jianying Pro) draft. Mac. |

## Install

**In Hey Atu:** open the Skill on [heyatu.com/skills](https://heyatu.com/skills), press **Copy to Atu** and paste it to Atu. Or send Atu:

```text
Install this Skill: https://heyatu.com/skills/auto-edit/install.md
```

**From a terminal:**

```sh
npx skills add https://heyatu.com      # from the site
npx skills add heyatu/skills           # from this repository
```

Open a new chat after installing; Skills load when a chat starts.

## Repository

```text
skills/<name>/          one Skill: SKILL.md, its documents, scripts/ and assets/
tools/build-site.mjs    builds dist/ for heyatu.com: the well-known index, the files, a zip and install.md per Skill
```

Add a Skill: create `skills/<name>/SKILL.md` with `name: <name>` and a `description`, then run `node tools/build-site.mjs`. Scripts use Node 20+ and no npm packages, so a Mac with Hey Atu needs nothing else. A Skill that needs a program downloads it in its own `scripts/setup.mjs` into its `bin/` folder (not committed).

## Licence

MIT, see [LICENSE](LICENSE). Third-party parts are listed in [NOTICE](NOTICE).
