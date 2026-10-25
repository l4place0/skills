# Skills Workspace

[中文](#中文) · [English](#english)

## 中文

这是 [`l4place0`](https://github.com/l4place0) 的 Agent Skills 统一开发与管辖仓库。

本仓库已从「Git 子模组」模式迁移完成：所有 skill 直接收纳在本仓库中，不再使用子模组。
每个 skill 位于仓库根目录的同名文件夹，内含 `SKILL.md` 及该 skill 自带的辅助文件。

### 已纳管的 Skills

| Skill | 用途 |
| --- | --- |
| [`prototype`](./prototype) | 把讨论过的想法快速做成 `proto/*` 分支上的可运行原型，并说明哪些是真的、哪些是假的 |
| [`job-hunter-zhipin`](./job-hunter-zhipin) | BOSS直聘求职自动化：按方向搜索、提取明文薪资与 JD、生成定制招呼语、CDP 真实点击发送、维护投递追踪索引。含 Onboarding 环境检查与 FAQ 故障库 |

### 已迁出的 Skills

以下 skill 已并入各自的产品仓库，统一按标准 skill 格式放在该仓库内的 `skills/<name>/` 目录，
不再在本仓库维护：

| Skill | 新位置 | 说明 |
| --- | --- | --- |
| `agent-video-sum` | [`l4place0/agent-video-sum`](https://github.com/l4place0/agent-video-sum) 的 `skills/agent-video-sum/` | 视频学习笔记、转录、关键帧与观众材料工作流 |
| `uni-agent-push` | [`l4place0/uni-agent-push`](https://github.com/l4place0/uni-agent-push) 的 `skills/uni-agent-push/` | 安装、配置、更新与诊断 Uni Push 通知 CLI |

### 已移除的 Skills

`graph-engineering-skill`、`powerful-codex` 与 `prototype-engineering-skill` 已不再以原有形态存在：

- `graph-engineering-skill`、`powerful-codex` 不再需要，已整体移除。
- `prototype-engineering-skill` 已重写为本仓库根目录下的 `prototype`，去掉了全部脚本、
  JSON 状态机与阶段闸门，改为纯 Markdown 引导型 skill。

这些独立 GitHub 仓库不因本仓库的移除动作而受影响。

### 克隆

```bash
git clone https://github.com/l4place0/skills.git
```

本仓库不再包含子模组，普通克隆即可获得全部内容。

### 开发流程

1. 在对应 skill 目录内直接修改。
2. 该 skill 若另有独立产品仓库，按该仓库的流程提交；否则直接在本仓库提交。
3. 保持每个 skill 目录自包含：不引用本机绝对路径，不依赖本仓库之外的文件。

完整的仓库协作约定见 [`AGENT.md`](./AGENT.md)。

## English

This is the unified development and governance workspace for Agent Skills maintained by [`l4place0`](https://github.com/l4place0).

The repository has finished migrating away from Git submodules. Every skill is now hosted
directly in this repository, one folder per skill at the repository root, each containing a
`SKILL.md` plus any helper files that skill needs.

### Managed Skills

| Skill | Purpose |
| --- | --- |
| [`prototype`](./prototype) | Turn a discussed idea into a running prototype on a `proto/*` branch, then report what is real versus faked |

### Migrated Skills

The following skills now live inside their product repositories under the standard skill layout
`skills/<name>/`, and are no longer maintained here:

| Skill | New location | Purpose |
| --- | --- | --- |
| `agent-video-sum` | `skills/agent-video-sum/` in [`l4place0/agent-video-sum`](https://github.com/l4place0/agent-video-sum) | Video learning notes, transcripts, key frames, and audience material workflows |
| `uni-agent-push` | `skills/uni-agent-push/` in [`l4place0/uni-agent-push`](https://github.com/l4place0/uni-agent-push) | Install, configure, update, and diagnose the Uni Push notification CLI |

### Removed Skills

`graph-engineering-skill`, `powerful-codex`, and `prototype-engineering-skill` no longer exist in
their original form:

- `graph-engineering-skill` and `powerful-codex` are no longer needed and were removed entirely.
- `prototype-engineering-skill` was rewritten as `prototype` at this repository root, dropping all
  scripts, JSON state, and phase gates in favour of a pure Markdown guidance skill.

Their standalone GitHub repositories are unaffected by this removal.

### Clone

```bash
git clone https://github.com/l4place0/skills.git
```

This repository no longer contains submodules, so a normal clone is complete.

### Development Workflow

1. Edit directly inside the relevant skill folder.
2. If that skill also has a standalone product repository, follow its process; otherwise commit here.
3. Keep each skill folder self-contained: no absolute local paths, no dependencies on files
   outside this repository.

See [`AGENT.md`](./AGENT.md) for the complete collaboration rules.
