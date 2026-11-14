# Hey Atu Skills

**🐶 [heyatu.com](https://heyatu.com) · [中文](https://heyatu.com/zh)**: Hey Atu keeps your AI working on your Mac, from your phone.

Free Skills from [Hey Atu](https://heyatu.com), in the open [Agent Skills](https://agentskills.io) format. They are written for Atu on your Mac, and work in other agents that read `SKILL.md` (Claude Code, Codex, Cursor and more).

| Skill | What it does |
|---|---|
| [auto-edit](skills/auto-edit/) | Give it a folder of footage and your script; it watches every clip, picks the shots and exports a first cut as an MP4 and an editable 剪映 (CapCut / Jianying Pro) draft. Mac. |

## Install

**In Hey Atu:** [download Hey Atu for Mac](https://heyatu.com), then send Atu:

```text
Install this Skill: https://github.com/hancyhxy/heyatu-skills/tree/main/skills/auto-edit
```

**From a terminal:**

```sh
npx skills add hancyhxy/heyatu-skills
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
