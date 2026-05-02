"""结局判定条文（与 rules.evaluate_ending 同步维护）。

供作弊码界面引用；普通帮助面板不包含本文。"""
from __future__ import annotations

# 与 evaluate_ending 逻辑一致时更新本常量。
DISPLAY_FOR_CHEAT = """\
[bold]当前版本结局条件[/bold]（一步 = 一整天；判定自上而下，先命中先结算）

[bold cyan]0. nagato_collapse[/bold cyan] — 长门有希的崩坏（暗线优先）
  · 长门疲劳度 ≥ 88（「向长门核对异常」「向长门借资料」会积累不同疲劳）

[bold cyan]1. haruhi_happy_new_world[/bold cyan] — 晴空下的新周目
  · 满意度 ≥ 85、线索 ≥ 10
  · flags：festival_plan, homework_done, truth_shared

[bold cyan]2. consensus_paradise[/bold cyan] — 共识温室
  · 满意度 ≥ 68、稳定度 ≥ 52、线索 ≥ 9
  · flags：hope_signal, truth_shared, homework_done

[bold cyan]3. kyon_breaks_loop[/bold cyan] — 切口与回声
  · 线索 ≥ 12、稳定度 ≥ 45
  · flags：anomaly_seen, homework_done, truth_shared

[bold cyan]4. meltdown_pact[/bold cyan] — 真相暴晒协议
  · 已 truth_shared；稳定度 ≤ 20；满意度 ≥ 38；闭锁空间次数 ≥ 1

[bold cyan]5. hollow_celebration[/bold cyan] — 空洞庆典
  · 有 festival_plan；[bold]无[/bold] truth_shared；满意度 ≥ 76；线索 ≤ 7

[bold cyan]6. archive_bound[/bold cyan] — 归档囚徒
  · 线索 ≥ 16；稳定度在 (0, 38] 区间
  · flags：anomaly_seen, clue_chain_started, truth_shared

[bold cyan]7. observer_bailout[/bold cyan] — 观测者脱钩
  · worldline_shift ≥ 48；线索 ≥ 9；满意度 ≤ 52；有 anomaly_seen

[bold cyan]8. shinirappears_unstable_world[/bold cyan] — 结构体崩解
  · 稳定度 ≤ 0；或（满意度 ≤ 5 且 闭锁空间次数 ≥ 2）

[dim]叙事为原创向群像寓言，不必对应单一原作剧情。[/dim]"""
