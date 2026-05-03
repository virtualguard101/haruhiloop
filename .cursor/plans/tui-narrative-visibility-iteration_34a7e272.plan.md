---
name: tui-narrative-visibility-iteration
overview: Refine the Textual TUI into a narrative-first hybrid presentation by hiding low-level internals, replacing key metrics with qualitative bands plus trend cues, and keeping a developer-accessible detailed view toggle.
todos:
  - id: mode-toggle
    content: Add hybrid/numeric mode state and keybinding in Textual TUI
    status: completed
  - id: hybrid-metric-panel
    content: Implement hybrid metric table with qualitative bands and hidden internals
    status: completed
  - id: trend-plumbing
    content: Track previous state and render concise trend hints
    status: completed
  - id: step-feedback-split
    content: Render narrative delta lines in hybrid mode and exact deltas in numeric mode
    status: completed
  - id: docs-tests
    content: Update TUI help/docs and add tests for mapping/toggle behavior
    status: completed
isProject: false
---

# TUI Narrative Hybrid Iteration Plan

## Goal
Make `haruhi-play` feel more like a text game by reducing exposed system internals while preserving player feedback through qualitative status bands and short trend cues.

## Scope
- In scope: Textual TUI only (`haruhi-play`).
- Out of scope: CLI commands (`start/status/step/simulate`) and non-TUI storage schema changes.

## Implementation Steps
- Introduce a **view density mode** in [src/haruhiloop_cli/play_app.py](/home/virtualguard/vg101/dev/haruhiloop/src/haruhiloop_cli/play_app.py):
  - Default to `hybrid` mode.
  - Add one keybinding (recommended `v`) to toggle `hybrid <-> numeric`.
  - Show current mode in subtitle/help text so players know what they are seeing.
- Split metric rendering in [src/haruhiloop_cli/view.py](/home/virtualguard/vg101/dev/haruhiloop/src/haruhiloop_cli/view.py):
  - Keep existing `make_metric_table(...)` as full numeric panel.
  - Add `make_metric_table_hybrid(state, prev_state=None)` for player-facing panel.
  - In hybrid panel, hide low-level internals (e.g. worldline shift, closed-space stage counters, mutator detail coefficients).
- Add qualitative status formatters in [src/haruhiloop_cli/i18n.py](/home/virtualguard/vg101/dev/haruhiloop/src/haruhiloop_cli/i18n.py):
  - New helpers for band labels (e.g. stability/satisfaction/fatigue/clue progression).
  - New helper for trend wording (`上升/下降/持平`) from previous state snapshot.
- Wire trend context in [src/haruhiloop_cli/play_app.py](/home/virtualguard/vg101/dev/haruhiloop/src/haruhiloop_cli/play_app.py):
  - Track previous `GameState` snapshot before each confirmed step.
  - Pass previous snapshot to hybrid table to render concise trend hints.
- Reduce mechanical leakage in step feedback within [src/haruhiloop_cli/view.py](/home/virtualguard/vg101/dev/haruhiloop/src/haruhiloop_cli/view.py):
  - In hybrid mode, replace exact `A -> B` deltas with short narrative impact lines.
  - Preserve current exact-delta output in numeric mode.
- Update help/docs for TUI controls and panel semantics:
  - [src/haruhiloop_cli/play_app.py](/home/virtualguard/vg101/dev/haruhiloop/src/haruhiloop_cli/play_app.py) help text.
  - [docs/tui-play-memo.md](/home/virtualguard/vg101/dev/haruhiloop/docs/tui-play-memo.md) with mode toggle behavior and what is hidden.

## Hybrid Panel Content Design
- Keep visible (qualitative):
  - 春日满意度, 世界稳定度, 线索推进, 团员协同, 长门状态, 作业进度.
- Show as: `档位词 + 趋势短语` (example pattern: `平稳（下降）`).
- Keep narrative-only metadata:
  - 叙事标记、结局标题/剧情。
- Hide by default in hybrid:
  - 世界线偏移、闭锁空间阶段/次数、扰动模式细节、记忆残留系数值、内部计数信息。

## Validation
- Run tests focused on TUI-adjacent rendering logic (existing and newly added).
- Add/update tests for:
  - Band mapping boundaries.
  - Trend output from previous/current states.
  - Mode toggle changes panel rendering path.
- Run lint diagnostics on edited files and fix any introduced issues.

## Risks and Mitigations
- Risk: players may lose tactical clarity.
  - Mitigation: always keep one-key toggle to numeric mode.
- Risk: trend wording becomes noisy.
  - Mitigation: only display trend on key fields and suppress neutral spam (`持平` can be omitted for non-critical rows).