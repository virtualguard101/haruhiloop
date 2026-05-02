# Haruhi Loop · TUI 玩法与实现备忘

本文记录 `play_app.py` 的交互约定与台词动效机制。

## 1) 引擎对齐

TUI 与 CLI 共用同一引擎与存档：

- `GameEngine.step`
- `rules.evaluate_events`
- `rules.evaluate_ending`
- `storage` 读写

## 2) 时间模型

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

额外：输入 `kyon` 打开结局条件作弊面板（开发向）。

## 4) 日文台词沉浸效果

核心台词：`過ぎ去った時間は、決して取り戻せないのよ`

### 常驻层

- 台词在 TUI 主界面常驻，不再只在 welcome 阶段出现
- 居中显示，含主字 + 残影层

### 定时动效

- `set_interval(0.7, ...)` 驱动相位变化
- 相位影响台词亮度和边框脉冲

### 世界线状态条

- 常驻显示 loop/day/shift 与文本时钟
- 每 5 tick 出现一次“倒放一拍”标记

### 跨日转场

- 对比执行前后 `day/loop_count`
- 变化时触发短帧 `transition_frames`，显示转场标题

### 状态驱动强化

- `closed_space_stage >= 2`：台词边框转为红系脉冲
- `nagato_fatigue >= 55/70/85`：逐级提高字符噪声化程度

## 5) 展示依赖 API

`play_app.py` 依赖：

- `build_quote_visual_state`
- `make_worldline_status_panel`
- `make_classic_quote_panel`
- `make_metric_table`
- `make_action_table`
- `make_step_panel`

## 6) 注意点

- 动效刷新频率保持低频，避免输入迟滞
- 噪声化仅轻微扰动，必须保证台词可辨识
- 别名兼容（`观察异常`）在规则层处理，不在 TUI 层处理
