# 结局条件（开发文档）

本文对应 `src/haruhiloop_cli/rules.py` 中 `evaluate_ending` 的真实判定顺序。

## 判定原则

- 自上而下，先命中先返回
- `nagato_collapse` 是最高优先级（长门疲劳暗线）
- `shinirappears_unstable_world` 是末端崩坏兜底

## 结局清单

| ending_id | 标题 | 条件摘要 |
|---|---|---|
| `nagato_collapse` | 长门有希的崩坏 | `nagato_fatigue >= 88` |
| `haruhi_happy_new_world` | 晴空下的新周目 | `satisfaction >= 85` 且 `clue_points >= 10` 且 `crew_sync >= 65` 且 flags 含 `festival_plan/homework_done/truth_shared` |
| `consensus_paradise` | 共识温室 | `satisfaction >= 68` 且 `stability >= 52` 且 `clue_points >= 9` 且 flags 含 `hope_signal/truth_shared/homework_done` |
| `kyon_breaks_loop` | 切口与回声 | `clue_points >= 12` 且 `stability >= 45` 且 `crew_sync >= 55` 且 flags 含 `anomaly_seen/homework_done/truth_shared` |
| `meltdown_pact` | 真相暴晒协议 | `truth_shared` 且 `stability <= 20` 且 `satisfaction >= 38` 且 `closed_space_count >= 1` |
| `hollow_celebration` | 空洞庆典 | `festival_plan` 且非 `truth_shared` 且 `satisfaction >= 76` 且 `clue_points <= 7` |
| `archive_bound` | 归档囚徒 | `clue_points >= 16` 且 `0 < stability <= 38` 且 flags 含 `anomaly_seen/clue_chain_started/truth_shared` |
| `observer_bailout` | 观测者脱钩 | `worldline_shift >= 48` 且 `clue_points >= 9` 且 `satisfaction <= 52` 且有 `anomaly_seen` |
| `shinirappears_unstable_world` | 结构体崩解 | `stability <= 0` 或 `closed_space_stage >= 3` 或 (`satisfaction <= 5` 且 `closed_space_count >= 2`) |

## 相关实现位置

- 判定逻辑：`src/haruhiloop_cli/rules.py`
- 结局长剧情：`src/haruhiloop_cli/ending_epilogues.py`
- TUI 作弊展示文案：`src/haruhiloop_cli/ending_conditions_zh.py`
