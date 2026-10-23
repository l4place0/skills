# Skills Workspace

[中文](#中文) · [English](#english)

## 中文

这是 [`l4place0`](https://github.com/l4place0) 的 Agent Skills 统一开发与管辖仓库。

本仓库正在从「Git 子模组」模式迁移到「单一仓库内直接收纳各 skill」的模式。迁移期间，仍在
本仓库维护的 skill 保留子模组形式，已并入产品仓库的 skill 只在此处保留指向说明。

### 已纳管的 Skills

| Skill | 归属 | 说明 |
| --- | --- | --- |
| [`prototype-engineering-skill`](https://github.com/l4place0/prototype-engineering-skill) | 本仓库子模组 | 在现有代码库中开发边界清晰、可验证的原型 |

### 已迁出的 Skills

以下 skill 已并入各自的产品仓库，统一按标准 skill 格式放在仓库内的 `skills/<name>/` 目录，
不再在本仓库维护：

| Skill | 新位置 | 说明 |
| --- | --- | --- |
| `agent-video-sum` | [`l4place0/agent-video-sum`](https://github.com/l4place0/agent-video-sum) 的 `skills/agent-video-sum/` | 视频学习笔记、转录、关键帧与观众材料工作流 |
| `uni-agent-push` | [`l4place0/uni-agent-push`](https://github.com/l4place0/uni-agent-push) 的 `skills/uni-agent-push/` | 安装、配置、更新与诊断 Uni Push 通知 CLI |

### 已移除的 Skills

`graph-engineering-skill` 与 `powerful-codex` 已不再需要，其子模组登记与版本指针已从本仓库删除。
对应的独立 GitHub 仓库不因本仓库的删除动作而受影响。

### 克隆与初始化

本仓库当前仍含一个子模组，推荐在克隆时一并初始化：

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

拉取本仓库的更新后，使用以下命令同步：

```bash
git pull
git submodule update --init --recursive
```

完整的仓库协作约定见 [`AGENT.md`](./AGENT.md)。

## English

This is the unified development and governance workspace for Agent Skills maintained by [`l4place0`](https://github.com/l4place0).

The repository is migrating from a Git-submodule model to directly hosting each skill in this
single repository. During the migration, skills still maintained here keep the submodule form,
while skills merged into their product repositories are only referenced from here.

### Managed Skills

| Skill | Ownership | Purpose |
| --- | --- | --- |
| [`prototype-engineering-skill`](https://github.com/l4place0/prototype-engineering-skill) | Submodule of this repository | Develop bounded and verifiable prototypes within existing codebases |

### Migrated Skills

The following skills now live inside their product repositories under the standard skill layout
`skills/<name>/`, and are no longer maintained here:

| Skill | New location | Purpose |
| --- | --- | --- |
| `agent-video-sum` | `skills/agent-video-sum/` in [`l4place0/agent-video-sum`](https://github.com/l4place0/agent-video-sum) | Video learning notes, transcripts, key frames, and audience material workflows |
| `uni-agent-push` | `skills/uni-agent-push/` in [`l4place0/uni-agent-push`](https://github.com/l4place0/uni-agent-push) | Install, configure, update, and diagnose the Uni Push notification CLI |

### Removed Skills

`graph-engineering-skill` and `powerful-codex` are no longer needed. Their submodule entries and
version pointers have been removed from this repository. Their standalone GitHub repositories are
unaffected by this removal.

### Clone and Initialize

This repository still contains one submodule, so cloning with submodules is recommended:

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

After pulling updates to this repository, synchronize with:

```bash
git pull
git submodule update --init --recursive
```

See [`AGENT.md`](./AGENT.md) for the complete collaboration rules.
