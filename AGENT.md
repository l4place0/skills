# Skill 统一开发仓库规则

本仓库是 `l4place0` 名下 Agent Skills 的统一开发与管辖仓库。当前纳管的 skill 均以 Git 子模组存在：

- `uni-push-skill`
- `graph-engineering-skill`
- `prototype-engineering-skill`
- `bili-tutor-skill`

## 仓库边界

- 每个 skill 的源代码、版本历史、Issue 与发布流程归其各自的 GitHub 仓库管理。
- 本仓库只负责统一入口、跨 skill 协作规则及各子模组版本指针，不复制或内嵌子仓库源码。
- 后续新增的独立 skill 默认以 Git 子模组加入本仓库根目录；除非用户明确要求，不将其源码直接并入本仓库历史。
- 子模组目录名应与其 GitHub 仓库名一致。

## 开发与提交

- 修改 skill 时，在对应子模组内创建分支、提交并推送；随后在本仓库提交更新后的子模组指针。
- 不把多个子模组的源码变更伪装成一个本仓库提交。总仓提交应清楚列出受影响的子模组及其目标提交。
- 不覆盖子模组内已有的未提交改动，不对任一仓库执行破坏性重置。
- 克隆或初始化本仓库时使用 `git clone --recurse-submodules`，或在克隆后执行 `git submodule update --init --recursive`。
- 拉取总仓更新后，执行 `git submodule update --init --recursive` 使各 skill 与记录的版本一致。

## 跨 Skill 协作

- 跨仓变更应先确认依赖顺序，并分别在相关子模组中验证。
- 一个 skill 对另一个 skill 的依赖必须通过明确、可复现的接口或版本表达，不依赖本机绝对路径。
- 共用工具或约定若形成独立演进单元，应建立独立仓库并以新的子模组纳管。
