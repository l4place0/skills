# Skills Workspace

[中文](#中文) · [English](#english)

## 中文

这是 [`l4place0`](https://github.com/l4place0) 的 Agent Skills 统一开发与管辖仓库。

各 skill 保留独立仓库、版本历史与发布流程；本仓库通过 Git 子模组统一记录它们的版本，并提供跨 skill 的协作入口。

### 已纳管的 Skills

| Skill | 用途 |
| --- | --- |
| [`uni-push-skill`](https://github.com/l4place0/uni-push-skill) | 安装、配置、更新与诊断 Uni Push |
| [`graph-engineering-skill`](https://github.com/l4place0/graph-engineering-skill) | 构建、校验与管理基于 JSON 的任务依赖图 |
| [`prototype-engineering-skill`](https://github.com/l4place0/prototype-engineering-skill) | 在现有代码库中开发边界清晰、可验证的原型 |
| [`bili-tutor-skill`](https://github.com/l4place0/bili-tutor-skill) | 编排视频学习、转录、关键帧与学习笔记工作流 |
| [`powerful-codex`](https://github.com/l4place0/powerful-codex) | Powerful Codex Skill 组；内含 `index-codex-session-value-skill` 会话治理子技能 |

### 克隆与初始化

推荐在克隆时一并初始化所有子模组：

```bash
git clone --recurse-submodules https://github.com/l4place0/skills.git
```

如果已经完成普通克隆：

```bash
git submodule update --init --recursive
```

### 开发流程

1. 在对应的子模组目录中创建分支、修改、验证并提交代码。
2. 将子模组提交推送到其独立 GitHub 仓库。
3. 回到本仓库，提交更新后的子模组版本指针。

拉取本仓库的更新后，使用以下命令同步所有 skill：

```bash
git pull
git submodule update --init --recursive
```

完整的仓库协作约定见 [`AGENT.md`](./AGENT.md)。

## English

This is the unified development and governance workspace for Agent Skills maintained by [`l4place0`](https://github.com/l4place0).

Each skill retains its own repository, version history, and release process. This repository tracks their versions as Git submodules and provides a shared entry point for cross-skill development.

### Managed Skills

| Skill | Purpose |
| --- | --- |
| [`uni-push-skill`](https://github.com/l4place0/uni-push-skill) | Install, configure, update, and diagnose Uni Push |
| [`graph-engineering-skill`](https://github.com/l4place0/graph-engineering-skill) | Build, validate, and manage JSON-based task dependency graphs |
| [`prototype-engineering-skill`](https://github.com/l4place0/prototype-engineering-skill) | Develop bounded and verifiable prototypes within existing codebases |
| [`bili-tutor-skill`](https://github.com/l4place0/bili-tutor-skill) | Orchestrate video learning, transcription, key-frame, and study-note workflows |
| [`powerful-codex`](https://github.com/l4place0/powerful-codex) | Powerful Codex skill group containing the `index-codex-session-value-skill` governance workflow |

### Clone and Initialize

Clone the repository together with all submodules:

```bash
git clone --recurse-submodules https://github.com/l4place0/skills.git
```

If the repository has already been cloned normally:

```bash
git submodule update --init --recursive
```

### Development Workflow

1. Create a branch, make changes, verify them, and commit inside the relevant submodule.
2. Push the submodule commit to its standalone GitHub repository.
3. Return to this repository and commit the updated submodule pointer.

After pulling updates to this repository, synchronize every skill with:

```bash
git pull
git submodule update --init --recursive
```

See [`AGENT.md`](./AGENT.md) for the complete collaboration rules.
