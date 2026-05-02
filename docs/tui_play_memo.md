# Haruhi Loop · 玩法与 TUI 备忘（持续更新）

> 本文记录「每一步逻辑」与键盘界面约定，随代码变更同步修订。  
> 引擎与规则的真源仍以 `engine.py`、`rules.py` 为准。

---

## 一、核心引擎：单步做了什么（与 CLI 相同）

执行顺序见 `GameEngine.step`（`src/haruhiloop_cli/engine.py`）：

1. 校验：若已结局则抛错；校验动作 ID（中文 ID / `resolve_action_ref`）。
2. 快照步前状态。
3. 应用动作增量：满意度、稳定度、线索、`flags`、`recent_actions`、连击、`worldline_shift`。
4. `rules.evaluate_events`：厌倦、日终偏移、 restless_search、闭锁空间及协同压制、hope_signal 等。
5. `rules.evaluate_ending`：是否写入结局。
6. `_advance_time`：**一日一步**——每步直接进入下一天（`day`、`loop_count` 各 +1），满意度与稳定度各 -1（循环压力）；不再区分早/午/晚时段。
7. 生成 `StepRecord` 写入历史（CLI/TUI 均在持久化层追加）。

### 时间尺度（重要）

- **当前模型**：`TIMESLOTS = ("day",)`，界面显示 **全天**。每一步玩家选择的动作代表 **一整天的主线安排**，随后结算「日终摩擦」事件（原仅在傍晚触发的 `day_end_drift`，现为 **每步一次**，数值不变）。
- **旧存档**：加载时 `timeslot_index` 会归零统一到新模式；`day` 等字段仍从存档读取。

---

## 二、Textual 界面（`play_app.py`）状态机

| 状态 / 变量 | 含义 |
|-------------|------|
| `run_id` | 当前存档目录名 |
| `state` | `GameEngine` 可变状态 |
| `_last_record` | 最近一步 `StepRecord`，用于展示「上一步」面板 |
| `_welcome_done` | 是否已走过至少一步（控制开局说明是否隐藏） |
| `_help_visible` | 帮助面板开关（`h` 切换） |
| `_pending_index` | **预选动作序号 1–8**；`None` 表示未选 |

### 按键约定（当前版本）

| 按键 | 行为 |
|------|------|
| `1`–`8` | 预选对应序号；动作表中该行 **反色高亮**；换数字即换高亮（本局未结束时） |
| `Enter` | **确认**执行当前预选；无预选则无操作 |
| `n` | 新局（清空预选、帮助、上一步展示等） |
| `q` | 退出 |
| `h` | 开/关帮助面板 |

### 与 CLI 的差异

- CLI：`haruhi step RUN 数字` 一步内直接执行，无预选。
- TUI：两步——**数字预选 + Enter 确认**，避免误触。

---

## 三、`view` 与展示

- `make_metric_table` / `make_step_panel`：指标与单步回顾。
- `make_action_table(..., highlight_index=)`：`highlight_index` 为 **1–8**，与序号列一致，用于 Rich **反色**行样式（`Style(bold=True, reverse=True)`）。

---

## 四、变更记录（changelog）

| 日期 | 说明 |
|------|------|
| 2026-05-02 | 初稿：记录引擎步序与 TUI 状态机；数字键改为「预选 + Enter 确认」，动作表支持 `highlight_index` 高亮。 |
| 2026-05-02 | 时间模型改为 **一日一步**：去掉早餐/午后/傍晚三段；`day_end_drift` 每步触发；`_advance_time` 每步推进一天。 |
| 2026-05-02 | 结局扩展为 **8 条**（`evaluate_ending` 重排）；标题与叙事偏原创寓言，详见 `docs/dev_endings.md`。 |
| 2026-05-02 | 长门暗线：「观察异常/整合线索」改为 **向长门核对异常**（门疲 +10）、**向长门借资料**（门疲 +16）；状态 **长门疲劳度**；新结局 **nagato_collapse**（疲劳 ≥88 优先结算）。 |

---

## 五、后续可扩展（备忘）

- 方向键在动作表内移动预选（与数字键并存）。
- `Esc` 取消预选。
- Footer 动态显示「确认」是否可用（依赖 `check_action`）。
