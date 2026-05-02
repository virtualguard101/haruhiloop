# 结局条件（开发文档）

本文描述 `rules.evaluate_ending` 的判定，供开发与调试对照。**不包含在玩家帮助内。**

游戏中查看：TUI 依次输入 **`kyon`**（见 `play_app` 实现）；**任意键**关闭面板。正文同步：`src/haruhiloop_cli/ending_conditions_zh.py`。

---

## 判定顺序

自上而下 **先匹配先返回**。**`nagato_collapse`（长门疲劳崩坏）永远最先判定**：疲劳 ≥88 时直接结算，压制其它表面「好」条件。其余结局仍以窄条件优先于宽条件；总崩坏 `shinirappears_unstable_world` 仍靠后。

---

## 结局列表（与代码同步）

| ending_id | 标题（中文） | 核心条件摘要 |
|-----------|-------------|-------------|
| `nagato_collapse` | 长门有希的崩坏 | **长门疲劳度 ≥88**（动作「向长门核对异常」+10、「向长门借资料」+16 / 步） |
| `haruhi_happy_new_world` | 晴空下的新周目 | 满意度 ≥85；线索 ≥10；festival + homework + truth |
| `consensus_paradise` | 共识温室 | 满意度 ≥68；稳定度 ≥52；线索 ≥9；hope_signal + truth + homework |
| `kyon_breaks_loop` | 切口与回声 | 线索 ≥12；稳定度 ≥45；anomaly + homework + truth |
| `meltdown_pact` | 真相暴晒协议 | truth_shared；稳定度 ≤20；满意度 ≥38；闭锁 ≥1 |
| `hollow_celebration` | 空洞庆典 | festival_plan；**无** truth_shared；满意度 ≥76；线索 ≤7 |
| `archive_bound` | 归档囚徒 | 线索 ≥16；稳定度 ∈ (0,38]；anomaly + clue_chain + truth |
| `observer_bailout` | 观测者脱钩 | worldline_shift ≥48；线索 ≥9；满意度 ≤52；anomaly_seen |
| `shinirappears_unstable_world` | 结构体崩解 | 稳定度 ≤0 **或**（满意度 ≤5 且 闭锁 ≥2） |

叙事定位为 **原创向时间循环寓言**，不必对齐《凉宫春日》单线剧情。

各结局 **长剧情正文** 维护在 `src/haruhiloop_cli/ending_epilogues.py`，结算后写入 `GameState.ending_epilogue`，在 CLI/TUI 指标表与「上一步」面板中展示。
