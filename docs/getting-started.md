# Haruhi Loop CLI 新人引导（v0）

这是一份面向第一次接触本项目的快速上手文档。跟着命令执行一遍，你就能完成一局的基本推进、查看历史并理解存档结构。

## 1) 环境准备

在项目根目录执行：

```bash
uv sync --extra dev
```

如果你暂时没有 `uv`，也可以使用：

```bash
pip install -e ".[dev]"
```

## 2) 开始第一局

```bash
uv run haruhi start
```

你会看到三部分输出：

1. 开局说明（背景、目标、操作提示）
2. 状态面板（包含循环次数、情绪值、稳定度、线索等）
3. 一行运行标识，例如：`已开始运行：a1b2c3d4`

请记下这个运行标识，后续命令都需要它。下文以 `RUN` 代称。

## 3) 推进一步剧情

有两种写法，都可以：

```bash
uv run haruhi step RUN 3
uv run haruhi step RUN 观察异常
```

- 第一种：使用面板中的动作序号（1–8）
- 第二种：使用完整中文动作名

`step` 会推进一个时段（早晨 -> 午后 -> 傍晚），并重新打印当前状态。

## 4) 连续推进到结局（示例流程）

下面是一套容易看懂机制的示例，不保证必定最优：

```bash
uv run haruhi step RUN 观察异常
uv run haruhi step RUN 整合线索
uv run haruhi step RUN 完成暑假作业
uv run haruhi step RUN 策划惊喜活动
uv run haruhi step RUN 同步循环真相
uv run haruhi step RUN 安抚春日
```

推进过程中，重点关注：

- `satisfaction`：春日情绪，太低会拖累整体走向
- `stability`：世界线稳定度，过低可能引发闭锁空间风险
- `clue_points`：线索累计，影响破局能力

## 5) 查看当前状态、历史与回放

```bash
uv run haruhi status RUN
uv run haruhi history RUN --last 10
uv run haruhi replay RUN
```

- `status`：看当前快照和可选动作
- `history`：看最近 N 步记录
- `replay`：回放整局并给出倾向小结

## 6) 批量模拟（可选）

想快速看“策略大概会导向什么结局”，可以运行：

```bash
uv run haruhi simulate --runs 100 --max-steps 30 --policy greedy
```

- `--policy random`：随机策略
- `--policy greedy`：贪心策略（默认）

## 7) 存档在什么位置

每局数据保存在：

```text
.haruhi_runs/<run_id>/
```

其中通常包含：

- `state.json`：当前状态
- `history.jsonl`：逐步历史

## 8) 常见问题

**Q: 提示找不到 run_id？**  
A: 先执行 `start`，确认你在后续命令中使用了完整的运行标识。

**Q: 动作名报错？**  
A: 优先使用数字序号（1–8），或确保中文动作名与面板一致。

**Q: 我想重开一局？**  
A: 再次执行 `uv run haruhi start` 即可生成新的 run。

---

完成以上步骤后，你已经掌握了本项目最核心的使用路径：`start -> step -> status/history/replay`。接下来可以尝试自己组合动作，观察不同世界线分支。
