# 鲸英模式 0.2.0（whale-elite）

DeepSeek Harness（dsh）的 Agent 预设。**0.2.0 的目标从「省 Token」改成「降低出错率」**：
宁可多花几步取证，也不让模型把猜测当结论交出去。

纯组合 bundle：只插入一条 `@deepseek-ai/dsh-agent-preset` 声明，不含任何 Host / Client
代码。安装后在预设选择器里出现「鲸英模式」。

## 一句话原理

编码 agent 的错不是「不够聪明」，而是**证据链断了**：没读原文就改、没回读就宣布完成、
没跑过就说已验证、读到的是被裁剪过的输出、压缩把之前读过的源码换成了摘要。
0.2.0 的每一处配置都对着其中一条。

由此撤销 1.0.0 的全部四处削减：

| 维度 | 1.0.0（省 Token） | 0.2.0（降错率） | 为什么反向 |
|---|---|---|---|
| 工具面 | 11 行，砍掉子代理 / workflow / plan / goal / web / present | 23 行（含分组子行 33 行），比内置 `standard` 多一行精确编辑 | 独立复核、查证事实、计划闸门都要工具支撑 |
| 工作区指令 | 不加载 | `maxBytes: 131072`（默认 65536 的 2 倍） | 项目自己的约定与命令是最便宜的正确率来源 |
| 压缩时机 | `thresholdRatio: 0.6`（更早压） | `0.9`（更晚压） | 压缩是唯一会**删除证据**的操作 |
| 压缩保留尾部 | `retainRatio: 0.12` | `0.4` | 保留四成原文，让「读过的源码」还在 |
| 工具结果裁剪 | 4096 / 2048 / 512 | 32768 / 16384 / 8192 | 读到被截断的构建日志 / 测试输出本身就是错因 |
| 运行时上下文 | `includeRuntimeContext: false` | 默认 `true` | 沙箱策略、审批策略要进 prompt；代价是前缀随运行时状态变化（1.0.0 的缓存目标不再考虑） |

## 三道检验闸门

写进 `persona.prefix`，是整套预设的正文；其余各行只是它的执行面。

| 闸门 | 时机 | 要求 |
|---|---|---|
| 一 · 定位证据 | 改动前 | 说清改哪个文件哪一行，依据是刚读到的哪几行；定位不到就先搜 |
| 二 · 回读证据 | 改动后 | 重新读改动片段确认落盘一致；再跑最快给出信号的校验（解析 / typecheck / lint / 最小单测取其一） |
| 三 · 可复现验证 | 交付前 | 给出能重跑的命令与真实结果（退出码 + 关键输出行）；没跑过的不许写「已验证」 |

配套纪律：事实由检查获得、首轮先取证、先读后写、最小改动、失败如实暴露（连错两次换策略）、
禁止编造引用与命令、非平凡改动用 `subagent_fork` 做**以找错为目标**的独立复核。

配套机制（不只是文字）：

- `plan-mode` 的 section 追加「每个计划步骤必须写明怎么证明它生效、什么输出能反驳它」，
  计划里没写证明方式的步骤算没计划完。
- `tool-str-replace-editor` 常驻：精确字符串替换，找不到锚点就显式报错，不会静默改错位置。
- `tool-fs-search` 的 `sampleOverCapGlobResults: false`：不采样超限结果，避免「文件不存在」的假象。
- `tool-web` 的 `fetch: true`：能查证就去查证。
- `subagent` / `subagent_fork` / `workflow`：单点复核与并行交叉验证的执行面。
- 文件系统的「未读即改拒绝」由 Host 侧的 `fs-observation-policy` 强制（本构建默认装载），
  预设不重复注册，只在人设里声明该策略存在。

## 与梁神模式的关系

形态同源：两者都是社区侧的 agent preset，骨架都取自内置 `minimal` + `standard`。
本版按社区「梁神模式」的思路重构，取舍如下。

**采纳**：
- 工作纪律本身——首轮先发一次只读调用再回答（梁神用 `phase1FirstCallInstruction` 表达）、
  先读后写、最小改动、失败如实暴露。
- 晋升后的**全工具面**（文件 / 搜索 / 作业 / 技能 / 目标 / 计划 / 压缩 / 委派 / 待办 / 检索）。
- 精确编辑面 `str_replace_editor`（梁神在 phase-1 就带上它）。
- 独立复核用的 `subagent_fork` 与 `workflow` 扇出。

**不采纳**：
- **两阶段工具目录切换 + `bootstrapMaxTokens: 1024`**。它靠「首轮只给两个工具」做轨迹锚定，
  是拿分 / 省 token 的手段，需要第三方 `tool-bootstrap.mjs` 插件；它与「少出错」没有因果关系，
  而砍掉首轮的工具面反而会让「首轮先取证」这条纪律失去执行面。
- **PTC 呈现（`run_code` 单工具）**：需要 Host 侧 `ptc-runtime`，且同样是为省 token。
- **持久 shell**：本机是 Windows，走原生 `pwsh` 工具。

参考实现：`HYBB-rash/dsh-liangshen`（梁神模式的维护分支，Apache-2.0）。

## 组成

```
preset-whale-elite  (order 20)
├── persona                    检验协议（prefix）+ 平台说明（suffix，只用 {{model}}）
├── agent-instructions         maxBytes: 131072
├── time-context
├── tool-bash / tool-pwsh      按平台二选一
├── tool-fs / tool-fs-search / str-replace-editor
├── tool-jobs / tool-schedule
├── skill-filesystem / tool-skill
├── command-goal / tool-goal
├── planning → plan-mode       计划闸门（含「每个步骤要写明证明方式」）
├── compaction → compaction-basic (0.9 / 0.4) + command-compact + tool-result-pruner (32768/16384/8192)
├── delegation → subagent-control / list-agents / subagent / subagent_fork / workflow-ptc / workflow
├── tool-ask-user / tool-todo / tool-web(fetch) / present
└── tool-plugin-manager / tool-plugin-market   （disabled，与 standard 一致）
```

## 安装

```bash
dsh plugin --profile web add github:SZYTree0312/dsh-whale-elite-preset
```

装完重启 dsh（不是刷新页面），在预设选择器里选「鲸英模式」。卸载：

```bash
dsh plugin --profile web remove dsh-whale-elite-preset
```

Windows 桌面端若走本地 link 安装：

```bash
dsh plugin --profile desktop add link:<绝对路径>\dsh-whale-elite-preset
```

## 已验证（2026-11-01，dsh 0.2.1-rc.5 桌面版）

在一份隔离的临时 DSH home 里做，不动真实 home：`DSH_HOME=<临时目录>`，
`dsh --profile whalev2 --from-default-profile web` 建 profile，再用
`--patch <本仓 cordis.patch.yml>` 叠加。

| 检查 | 命令 | 结果 |
|---|---|---|
| 组合通过 | `dsh --profile whalev2 --patch cordis.patch.yml --dump-config` | 退出码 0，树中出现 `preset-whale-elite` |
| schema 零新增错误 | `dsh --profile whalev2 [--patch …] --dump-config-schema` | 基线 4 条 error，加载本补丁后仍 4 条（stock 的 4 个内置 preset 的既有投影限制） |
| 插件名 / 子路径解析 | `scripts/verify-plugin-names.cjs` | 30 个不重复的插件名 / 子路径全部命中安装包，`failures=0`（含 `dsh-plugin-manager/tools`、`dsh-tool-subagent-control/list-agents`） |
| 配置键名存在 | `scripts/verify-config-keys.cjs` | 12 个包、全部键名命中，`missing_keys=0` |
| 提示词变量合法 | `scripts/verify-prompt-variables.cjs` | 本构建只注册 `provider` / `model`；本预设只用 `{{model}}` |
| 补丁 YAML 可解析 | `scripts/verify-patch-yaml.cjs` | 23 个顶层行 / 33 行含子行；分组 `planning:1`、`compaction:3`、`delegation:6`；`!!js` 只出现在两行平台开关上 |
| 真实启动 | `dsh --profile whalev2 --patch … --port 5199 --no-open` | 启动成功并输出带 token 的 URL，无 preset activation 警告 |

四个校验脚本需要以 Electron-as-Node 运行（dsh 的包在 `app.asar` 里，普通 Node 看不到）：

```powershell
$env:ELECTRON_RUN_AS_NODE=1
& "<安装目录>\DeepSeek Harness.exe" scripts\verify-plugin-names.cjs `
  cordis.patch.yml "<安装目录>\resources\app.asar\dsh\node_modules" out.txt
```

**未验证**：真实模型会话下的 persona 渲染与工具面表现——本次验证在无网络的沙箱内完成，
跑不了带 key 的模型轮次。上面「配置可用」的结论到此为止，「错率下降了多少」需要你自己的会话数据。

## 兼容与限制

- 基线：dsh `0.2.1-rc.5`（本机实测的安装版本）。插件名与配置键均按该版本核对；
  上游明示会有破坏性变更，升级后请重跑上面四个脚本。
- 压缩的实际触发点还取决于 route 的 `contextWindow`：没配就回落 262144，
  `thresholdRatio: 0.9` 与 `messageBudget − headroomTokens` 取小者。想更晚压缩要配 route，不是改这里。
- `retainRatio` 必须小于 `thresholdRatio`（`compaction-basic` 的校验），0.4 < 0.9 成立；
  再抬高保留比例就要一起抬 `thresholdRatio`。
- 本预设**不省 Token**：相比之下它更贵。这是明确的取舍，不是缺陷。
- 需要子代理 / workflow 的能力依赖 Host 侧注册表；若你在精简部署里关掉了它们，
  对应工具行会进入 preset 的 activation audit（选择器里显示加载失败），不会静默降级。

## 许可证

MIT。参考的梁神模式实现为 Apache-2.0，本仓未复制其代码，仅按其思路重写了组合与提示词。