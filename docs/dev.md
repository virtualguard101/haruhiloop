# 结局条件（开发文档）

本文对应 `src/haruhiloop_cli/rules.py` 中 `evaluate_ending` 的真实判定顺序。

## 判定原则

- 自上而下，先命中先返回
- `nagato_collapse` 是最高优先级（长门疲劳暗线）
- `shinirappears_unstable_world` 是末端崩坏兜底

## 结局清单

| ending_id | 标题 | 条件摘要 |
|---|---|---|
| `nagato_collapse` | 长门有希的崩坏 | `nagato_fatigue >= 96` 且 `investigation >= 5` |
| `haruhi_happy_new_world` | 晴空下的新周目 | `breakthrough >= 3` 且 `coordination >= 2`，并满足 `satisfaction >= 85`、`clue_points >= 10`、`crew_sync >= 65` 与 flags `festival_plan/homework_done/truth_shared` |
| `consensus_paradise` | 共识温室 | `coordination >= 3`，并满足 `satisfaction >= 68`、`stability >= 52`、`clue_points >= 9` 与 flags `hope_signal/truth_shared/homework_done` |
| `kyon_breaks_loop` | 切口与回声 | `investigation >= 3` 且 `coordination >= 2`，并满足 `clue_points >= 12`、`stability >= 45`、`crew_sync >= 55` 与 flags `anomaly_seen/homework_done/truth_shared` |
| `meltdown_pact` | 真相暴晒协议 | `同步循环真相 >= 1`，并满足 `truth_shared`、`stability <= 20`、`satisfaction >= 38`、`closed_space_count >= 1` |
| `hollow_celebration` | 空洞庆典 | `策划惊喜活动 >= 2`，并满足 `festival_plan`、非 `truth_shared`、`satisfaction >= 76`、`clue_points <= 7` |
| `archive_bound` | 归档囚徒 | `向长门借资料 >= 3`，并满足 `clue_points >= 16`、`0 < stability <= 38` 与 flags `anomaly_seen/clue_chain_started/truth_shared` |
| `observer_bailout` | 观测者脱钩 | `investigation >= 2`，并满足 `worldline_shift >= 48`、`clue_points >= 9`、`satisfaction <= 52` 与 `anomaly_seen` |
| `shinirappears_unstable_world` | 结构体崩解 | `stability <= 0` 或 `closed_space_stage >= 3` 或 (`satisfaction <= 5` 且 `closed_space_count >= 2`) |

## 相关实现位置

- 判定逻辑：`src/haruhiloop_cli/rules.py`
- 结局长剧情：`src/haruhiloop_cli/ending_epilogues.py`
- TUI 作弊展示文案：`src/haruhiloop_cli/ending_conditions_zh.py`
