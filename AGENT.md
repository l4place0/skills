# Skill 统一开发仓库规则

本仓库是 `l4place0` 名下 Agent Skills 的统一开发与管辖仓库。

## 当前模式：单一仓库直接收纳

本仓库已完成从 Git 子模组到「单一仓库直接收纳各 skill」的迁移，不再使用子模组。

- 每个 skill 位于仓库根目录的同名文件夹。
- 每个 skill 目录自包含，至少包含 `SKILL.md`，可按需附带 `references/`、`scripts/` 等辅助文件。
- 目录名与 `SKILL.md` 中 frontmatter 的 `name` 保持一致。

### 当前纳管的 skill

| Skill | 形态 |
| --- | --- |
| `prototype` | 纯 Markdown 引导型，无脚本、无状态机 |

### 已迁出到产品仓库的 skill

| Skill | 新位置 |
| --- | --- |
| `agent-video-sum` | [`l4place0/agent-video-sum`](https://github.com/l4place0/agent-video-sum) 的 `skills/agent-video-sum/` |
| `uni-agent-push` | [`l4place0/uni-agent-push`](https://github.com/l4place0/uni-agent-push) 的 `skills/uni-agent-push/` |

已迁出的 skill 由对应产品仓库负责，本仓库不再保留副本，避免双份维护。

### 已移除的 skill

- `graph-engineering-skill`、`powerful-codex`：不再需要，已整体移除。
- `prototype-engineering-skill`：已重写为根目录下的 `prototype`，去掉脚本、JSON 状态机与阶段闸门，
  改为纯 Markdown 引导。原独立仓库 `l4place0/prototype-engineering-skill` 保留在 GitHub 上作为历史，
  但不再与 `prototype` 同步。

## 仓库边界

- 每个 skill 的语义内容归其所在目录管理；本仓库不复制已迁出 skill 的源码。
- 不把本机绝对路径、个人环境变量或仓库外的文件写进 skill。
- 不覆盖仓库内已有的未提交改动，不对仓库执行破坏性重置。

## 开发与提交

- 直接修改对应 skill 目录，随后在本仓库提交。
- 若某个 skill 同时存在独立产品仓库，应在该仓库按标准 `skills/<name>/` 布局维护，并更新本文档的归属表。
- 一个提交只表达一类变更；不要把互不相关的 skill 改动混成一个提交。
- 提交前确认 `SKILL.md` 的 frontmatter 可解析、`name` 与目录名一致。

## 跨 Skill 协作

- 一个 skill 对另一个 skill 的依赖必须通过明确、可复现的接口或版本表达，不依赖本机绝对路径。
- 共用工具或约定若形成独立演进单元，应建立独立仓库维护，而不是在 skill 目录间复制。
