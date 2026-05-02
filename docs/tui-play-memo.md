# Haruhi Loop · TUI 玩法与实现备忘

本文记录 `play_app.py` 的交互约定，以及它与当前引擎的对齐关系。

## 1) 引擎对齐

TUI 与 CLI 共用同一引擎：

- `GameEngine.step`
- `rules.evaluate_events`
- `rules.evaluate_ending`
- `storage` 读写

因此 TUI 不引入额外业务判定，只负责“预选 + 确认”交互。

## 2) 时间模型（当前）

当前是三时段模型：

- `morning`
- `afternoon`
- `evening`

每次执行一步推进一个时段；傍晚后才进入下一天。

## 3) 按键约定

| 按键 | 行为 |
|---|---|
| `1-8` | 预选动作序号（表格高亮） |
| `Enter` | 执行当前预选 |
| `n` | 新开一局 |
| `h` | 帮助面板开关 |
| `q` | 退出 |

额外：输入 `kyon` 可打开结局条件作弊面板（开发向）。

## 4) 展示模块依赖

`play_app.py` 依赖以下 `view` API：

- `make_metric_table`
- `make_action_table`
- `make_step_panel`

这三个 API 也被 CLI 路径复用，避免双份渲染逻辑。

## 5) 与 CLI 的差别

- CLI：`step` 直接执行
- TUI：先按数字预选，再按 `Enter` 确认

其余状态推进、存档结构、结局判定一致。

## 6) 当前注意点

- Action 序号必须与 `rules.ORDERED_ACTION_IDS` 一致
- TUI 使用序号映射动作，不绕过 `resolve_action_ref`
- 别名兼容（如 `观察异常`）在规则层处理，不在 TUI 层处理
