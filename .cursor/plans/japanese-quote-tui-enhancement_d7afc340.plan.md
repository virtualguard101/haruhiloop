---
name: japanese-quote-tui-enhancement
overview: 规划一套仅日文台词的沉浸式 TUI 动效方案：常驻展示，并叠加残影、危机入侵、跨日转场、倒放时钟与噪声化效果。
todos:
  - id: quote-render-model
    content: 在 view.py 抽象台词渲染状态与残影/脉冲/噪声生成逻辑
    status: completed
  - id: tui-animation-loop
    content: 在 play_app.py 增加常驻动画 ticker 和跨日转场触发缓存
    status: completed
  - id: always-visible-layout
    content: 重排 TUI 主布局以实现台词常驻和倒放时钟展示
    status: completed
  - id: state-driven-effects
    content: 接入 closed_space_stage 与 nagato_fatigue 的状态驱动视觉强化
    status: completed
  - id: docs-sync
    content: 更新 README_zh-CN 与 docs/tui-play-memo 的动效说明与触发条件
    status: completed
  - id: verification
    content: 跑测试并检查交互响应，必要时补充渲染状态单测
    status: completed
isProject: false
---

# 日文台词 TUI 沉浸优化计划

## 目标范围

- 仅保留日文台词 `過ぎ去った時間は、決して取り戻せないのよ。`，移除中文副文案。
- 台词在 TUI 中常驻展示，并在关键状态下触发不同强度的氛围动效。
- 保持 CLI 基础可读性，不把重动效扩散到 CLI 流程。

## 关键改动点

- 台词与面板构建函数：[`/home/virtualguard/vg101/dev/haruhiloop/src/haruhiloop_cli/view.py`](/home/virtualguard/vg101/dev/haruhiloop/src/haruhiloop_cli/view.py)
- TUI 主循环与定时刷新：[`/home/virtualguard/vg101/dev/haruhiloop/src/haruhiloop_cli/play_app.py`](/home/virtualguard/vg101/dev/haruhiloop/src/haruhiloop_cli/play_app.py)
- 状态来源（跨日、闭锁阶段、疲劳）：[`/home/virtualguard/vg101/dev/haruhiloop/src/haruhiloop_cli/models.py`](/home/virtualguard/vg101/dev/haruhiloop/src/haruhiloop_cli/models.py), [`/home/virtualguard/vg101/dev/haruhiloop/src/haruhiloop_cli/engine.py`](/home/virtualguard/vg101/dev/haruhiloop/src/haruhiloop_cli/engine.py)
- 文档同步：[`/home/virtualguard/vg101/dev/haruhiloop/docs/tui-play-memo.md`](/home/virtualguard/vg101/dev/haruhiloop/docs/tui-play-memo.md), [`/home/virtualguard/vg101/dev/haruhiloop/README_zh-CN.md`](/home/virtualguard/vg101/dev/haruhiloop/README_zh-CN.md)

## 动效设计（沉浸组合）

1. **残影台词层（常驻）**
   - 主台词始终居中显示。
   - 叠加 2-3 层轻偏移残影（弱亮度），形成时间残留感。
   - 以低频相位切换实现“呼吸式闪动”，避免高频闪烁。

2. **闭锁空间入侵边框（状态驱动）**
   - 当 `closed_space_stage > 0` 时，台词面板边框进入脉冲模式。
   - 阶段越高，脉冲越明显（但保持可读）。

3. **跨日世界线转场（事件驱动）**
   - 侦测 `day` 或 `loop_count` 变化时，短时显示世界线转场信息后回落。
   - 转场持续时间短（约 1 秒），不阻塞输入。

4. **倒放时钟文本（常驻侧栏）**
   - 在主面板上方或侧边增加文本时钟组件。
   - 正向计时为主，周期性插入“倒退一拍”以强化循环感。

5. **疲劳噪声化（阈值触发）**
   - 当 `nagato_fatigue` 超过阈值（如 70+）时，台词字符偶发轻微扰动。
   - 扰动仅 1 帧或短周期，避免阅读障碍。

## 实施步骤

1. 在 `view.py` 统一抽象“台词渲染状态对象”（相位、危机等级、噪声等级、转场标志）。
2. 在 `play_app.py` 增加轻量 animation ticker（固定间隔更新相位），并与 `state` 同步计算视觉状态。
3. 在 `_refresh_main()` 重组区域顺序：世界线/时钟层 -> 台词层 -> 现有指标表/动作表。
4. 增加跨日侦测缓存（记录上一次 `day`/`loop_count`），触发一次性转场。
5. 保留 CLI 兼容：CLI 仅继续展示静态日文台词面板，不引入复杂动效。
6. 文档更新：补充 TUI 动效触发条件、性能与可读性约束。

## 验收标准

- TUI 内台词常驻，且在三类场景出现可感知变化：常态呼吸、闭锁入侵、跨日转场。
- 高疲劳阶段能观测到轻微噪声化效果，但不影响台词识别。
- `q/n/h/数字/Enter` 交互延迟无明显恶化。
- 现有测试通过，必要时补充 1-2 个“渲染状态计算”单测（纯函数层）。

## 风险与控制

- 风险：动效过强影响读性。
  - 控制：统一低频刷新、限制相位数、降低字符扰动比例。
- 风险：刷新过于频繁影响 TUI 响应。
  - 控制：固定较低 tick（如 600-900ms），仅在状态变化时局部重绘。
- 风险：样式耦合导致后续维护困难。
  - 控制：把动效参数集中配置在 `view.py` 的常量区。