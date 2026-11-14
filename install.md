# Install a Hey Atu Skill

You are an AI assistant on the user's Mac (Hey Atu, or another agent that can run commands). The user asked you to install a Skill from https://github.com/hancyhxy/heyatu-skills. Follow these steps, then report in the user's language. Default Skill: `auto-edit`, unless the user named another folder under `skills/`.

1. Download the repository:

   ```sh
   T="$(mktemp -d)" && cd "$T" && curl -fsSL -o skills.zip https://codeload.github.com/hancyhxy/heyatu-skills/zip/refs/heads/main && ditto -x -k skills.zip .
   ```

   If GitHub cannot be reached, try `npx -y skills@latest add hancyhxy/heyatu-skills -g -y`, or tell the user the network blocked the download.

2. Copy the Skill into the Skills folder, replacing an older copy:

   ```sh
   NAME=auto-edit
   SKILLS="${PI_CODING_AGENT_DIR:-$HOME/.pi/agent}/skills"
   mkdir -p "$SKILLS" && rm -rf "$SKILLS/$NAME" && cp -R "$T/heyatu-skills-main/skills/$NAME" "$SKILLS/$NAME"
   ```

   Hey Atu reads `~/.pi/agent/skills/`. For another agent, use its Skills folder instead (Claude Code: `~/.claude/skills/`, Codex: `~/.codex/skills/`).

3. Run `node "$SKILLS/$NAME/scripts/setup.mjs"` when that file exists, and check that it prints `"ok": true`. It downloads FFmpeg on the first run.

4. Tell the user: the Skill is installed and ready in a **new chat**. For auto-edit, add: type `/` in the message box and pick **auto-edit**, then drop in a footage folder (music files go in the same folder) and say what the video is about, or ask Atu to suggest a script.
