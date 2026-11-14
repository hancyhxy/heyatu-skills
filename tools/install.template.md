# Install the {{name}} Skill

You are an AI assistant on the user's Mac (Hey Atu, or another agent that can run commands). The user asked you to install this Skill. Follow these steps, then report in the user's language.

What it does: {{description}}

1. Download and check it:

   ```sh
   cd "$(mktemp -d)" && curl -fsSL -o {{name}}.zip {{site}}/skills/{{name}}.zip
   shasum -a 256 {{name}}.zip
   ```

   The checksum must be `{{sha256}}`. If it differs, stop and tell the user the download failed.

2. Put it in the Skills folder, replacing an older copy:

   ```sh
   SKILLS="${PI_CODING_AGENT_DIR:-$HOME/.pi/agent}/skills"
   mkdir -p "$SKILLS" && rm -rf "$SKILLS/{{name}}" && ditto -x -k {{name}}.zip "$SKILLS"
   ```

   Hey Atu reads `~/.pi/agent/skills/`. For another agent, use its Skills folder instead (Claude Code: `~/.claude/skills/`, Codex: `~/.codex/skills/`).

3. If `$SKILLS/{{name}}/scripts/setup.mjs` exists, run `node "$SKILLS/{{name}}/scripts/setup.mjs"` and check that it prints `"ok": true`.

4. Tell the user: the Skill is installed, and it is ready in a **new chat**. Then one sentence on how to start it.

Source and issues: https://github.com/heyatu/skills
