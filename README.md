# Hey Atu Skills

**🐶 [heyatu.com](https://heyatu.com) · [中文](https://heyatu.com/zh)**: Hey Atu keeps your AI working on your Mac, from your phone.

Free Skills from [Hey Atu](https://heyatu.com), in the open [Agent Skills](https://agentskills.io) format. They are written for Atu on your Mac, and work in other agents that read `SKILL.md` (Claude Code, Codex, Cursor and more).

| Skill | What it does |
|---|---|
| [auto-edit](skills/auto-edit/) | Give it a folder of footage and your script (or let it suggest one); it watches every clip, lets you pick takes on one page, and exports a first cut as an MP4 and an editable 剪映 (CapCut / Jianying Pro) draft. Mac. |

---

## 中文：自动剪辑 Skill 怎么用

**你拍、你定脚本、你选 take；阿图看素材、排片、出 MP4 和剪映草稿。** 素材全程留在你的 Mac 上。

### 1. 安装（只做一次）

1. 下载 [Hey Atu Mac 版](https://heyatu.com/zh) 并登录。
2. 在 Hey Atu 里新开一个对话，把这句话发给阿图：

   ```text
   帮我安装这个 Skill：https://raw.githubusercontent.com/hancyhxy/heyatu-skills/main/install.md
   ```

3. 阿图装好后会告诉你。**新开一个对话**就能用了。

会用终端的话，也可以：`npx skills add hancyhxy/heyatu-skills`

### 2. 剪一条视频

1. 把这次的视频放进一个文件夹。要配音乐的话，把音乐文件（mp3、m4a…）也放进同一个文件夹。
2. 新对话里在输入框打「/」，选 **auto-edit**，把文件夹拖进来，再说一句想要什么，比如：
   > 剪成 30 秒竖屏 vlog，纯 BGM：出门 → 路上 → 到海边。

   没想好脚本也行，说「你看着剪」，阿图看完素材会按模板推荐一个，你确认或改几句就行。
3. 阿图看完全部素材后，给你一个**选片页**：同一个镜头有几条能用的 take，都放在这一页，已经帮你预选好。点「选」换掉，把页面底部那句话发回给阿图。
4. 阿图出片：
   - MP4 初剪（原分辨率，iPhone HDR 自动校色）+ SRT 字幕；
   - 装了剪映专业版的话，剪映首页会多一个草稿，用的是完整原片，可以接着修剪、换镜头、加特效。
5. 想改就直接说「第 3 段换一个」「开头短一点」，阿图会再出选片页或新版本，旧版本都保留。

### 模板

没有脚本时，阿图可以用这些模板（内容 × 声音任意组合）：

- 内容：一日 vlog、旅行/出门、好物/种草、健身训练、混剪卡点
- 声音：带 BGM（音乐 + 原声）、纯 BGM、原声、后配口播（阿图按你的旁白文字排画面，你在剪映里录音）

### 需要什么

- 一台装了 Hey Atu 的 Mac，和一个能看图的模型（阿图要看你的素材）。
- 剪映专业版（Mac）：可选，想手动精修时用。没有也能拿到 MP4。
- 音乐：Skill 不自带，请用你有权使用的音乐。

### 目前做不到

- 听不到素材里的说话声：对着镜头说话的视频，阿图只能按画面剪，请检查有没有切断句子。
- 只支持 Mac。

问题和建议：[提 Issue](https://github.com/hancyhxy/heyatu-skills/issues)。

---

## English

### Install

**In Hey Atu:** [download Hey Atu for Mac](https://heyatu.com), then send Atu:

```text
Install this Skill: https://raw.githubusercontent.com/hancyhxy/heyatu-skills/main/install.md
```

**From a terminal:** `npx skills add hancyhxy/heyatu-skills`

Open a new chat after installing; Skills load when a chat starts. Then type `/`, pick **auto-edit**, drop in a footage folder (music files go in the same folder) and say what the video is about.

## Repository

```text
skills/<name>/   one Skill: SKILL.md, its documents, scripts/ and assets/
install.md       the install steps that Atu follows
```

Add a Skill: create `skills/<name>/SKILL.md` with `name: <name>` and a `description`. Scripts use Node 20+ and no npm packages, so a Mac with Hey Atu needs nothing else. A Skill that needs a program downloads it in its own `scripts/setup.mjs` into its `bin/` folder (not committed).

## Licence

MIT, see [LICENSE](LICENSE). Third-party parts are listed in [NOTICE](NOTICE).
