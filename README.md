# 鲸英模式（whale-elite）

DeepSeek Harness 的一个省 Token、高效率的 Agent 预设。纯组合 bundle，不含任何
Host / Client 代码——只插入一条 `@deepseek-ai/dsh-agent-preset` 声明。

安装后在 Agent 预设选择器里出现「鲸英模式」。

## 它省在哪

四个着力点，全部是组合层的取舍，不改一行业务代码：

| 维度 | 标准模式 | 鲸英模式 | 省在哪 |
|---|---|---|---|
| 插件行 | 19 | 11 | 去掉 goal、plan-mode、4 个子代理、workflow、ralph、web、present、plugin-manager |
| 工作区指令文件 | 加载（`agent-instructions`，64 KB 上限） | 不加载 | 不再把 AGENTS.md 链渲染进 prompt |
| 运行时上下文 | 注入 | `includeRuntimeContext: false` | 系统提示不随运行时状态变动 |
| 压缩头寸 `headroomTokens` | 65536 | 32768 | 更早触发压缩 |
| 压缩保留尾部 `retainRatio` | 0.16 | 0.12 | 更早触发压缩 |
| 工具结果裁剪阈值 | 8192 字符 | 4096 字符 | 长输出更早被裁 |
| 裁剪保留 head / tail | 4096 / 1024 | 2048 / 512 | 单条工具结果更小 |

外加一层 prompt 纪律（写在 `persona.prefix` 里）：先查后写、只读需要的片段、
同回合并行发工具调用、不写过程旁白、不生成未被要求的文件、最终答复只给结论和改动位置。

## 与梁神模式的关系

两者都是社区侧的 agent preset，方向不同：梁神模式追求**首轮轨迹锚定**拿高分，
鲸英模式追求**单位 Token 产出**。可以同时装，按任务切换。

## 安装

```bash
dsh plugin --profile web add github:SZYTree0312/dsh-whale-elite-preset
```

装完重启 dsh（不是刷新页面），在预设选择器里选「鲸英模式」。

Windows 桌面端若走本地 link 安装：

```bash
dsh plugin --profile desktop add link:<绝对路径>\dsh-whale-elite-preset
```

## 卸载

```bash
dsh plugin --profile web remove dsh-whale-elite-preset
```

## 什么时候别用它

- 需要子代理、workflow、计划模式的复杂多步任务——这些工具被裁掉了。
- 需要联网检索的任务——`tool-web` 不在工具面里。
- 项目强依赖 `AGENTS.md` 等指令文件时——该插件未加载，指令不会进入 prompt。
- 长上下文里需要回溯大量历史时——`retainRatio` 0.12 意味着更早的原文会被摘要替换。

## 兼容

上游基线 `deepseek-ai/deepseek-harness` `0.2.0-rc.2`。上游明示会有破坏性变更，
预设内的插件名若随版本改名，本补丁需同步调整。

## 许可证

MIT
