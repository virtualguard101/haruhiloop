# Haruhi Loop · Web

`haruhiloop` 的 Web 终端版（纯前端 TypeScript + xterm.js）。

视觉与交互对齐 `src/haruhiloop_cli/play_app.py` 的 Textual TUI 与 `interfaces/cli/commands.py` 的 Typer CLI；所有规则、9 个结局判定、5 个子系统数学公式与 Python 权威实现等价（见 `tests/golden/golden.spec.ts` 跨语言对比）。

## 启动

```bash
cd web
npm install
npm run dev      # http://localhost:5173
npm run build    # 输出到 dist/，可直接静态部署到 GitHub Pages / Vercel
npm test         # 7 个 spec / 30 个用例
npm run typecheck
```

## 模式

- 默认 `?mode=play`：1:1 复刻 TUI 体验（entry 菜单、存档加载、game 屏幕、kyon 秘籍页）
- `?mode=cli`：与 Typer CLI 等价的命令模式，支持 `start / step / status / history / replay / simulate`

## 数据持久化

存档保存在浏览器 IndexedDB（`haruhiloop` 数据库，`runs` / `history` / `meta` 三个 store），等价 Python 端的 `.haruhiloop_runs/<run_id>/{state.json,history.jsonl}` 结构，schema_version 与 Python 端 `CURRENT_SCHEMA_VERSION = 2` 保持一致。

## 与 Python 实现的等价性

- **数值规则**：100% 1:1 复刻（场景 delta、5 个 evaluate_events 条件、9 个结局优先级、4 个子系统、deterministic mutator 公式）
- **AI mutator**：用 `mulberry32` 替代 Python `random.Random`，逻辑等价但二进制不一致
- **action_flavor**：用 `cyrb53` 替代 `hashlib.sha256` 作种子；同一 run_id + seed 下 TS 自身可重现，但与 Python 的具体文本选择可能不同
- **跨语言 golden 测试**：在 `mutator_mode = "deterministic"` 下用 `scripts/dump_golden.py`（Python 端）生成参考序列，TS 端 `tests/golden/golden.spec.ts` 对比所有状态字段（除 `scene_flavor_recent` 这一允许差异字段）

刷新 golden 数据：

```bash
# 在 Python 项目根
uv run python scripts/dump_golden.py
```

## 目录结构

```
src/
├─ main.ts                     # 入口：xterm 初始化 + ?mode 路由
├─ domain/                     # 与 src/haruhiloop_cli/ 1:1 翻译的核心引擎
├─ application/                # GameService + 策略
├─ infrastructure/             # IndexedDB / clamp / PRNG
├─ narrative/i18n.ts           # 标签字典 + format_*/band_*
├─ interfaces/
│  ├─ tui/                     # 终端美学渲染层
│  └─ cli/commands.ts          # CLI 模式
└─ styles/terminal.css

tests/
├─ engine.spec.ts              # 等价 tests/test_engine.py
├─ endings.spec.ts             # 等价 tests/test_endings.py
├─ systems.spec.ts             # 等价 tests/test_systems_v03.py
├─ mutator.spec.ts             # 等价 tests/test_mutator.py
├─ flavor.spec.ts              # 等价 tests/test_action_flavor.py
├─ render.spec.ts              # 等价 tests/test_tui_hybrid_view.py
└─ golden/                     # 跨语言 golden 对比
```

## 键位（play 模式）

| 键 | 行为 |
|---|---|
| 数字键 1–9 | 先选场景，再选选项；存档页用作分页项选择 |
| Enter | 确认执行当前 (场景, 选项) |
| r | 重置预选 |
| n | 新开一局 |
| v | 切换混合叙事 / 详细数值 |
| h | 显示/隐藏帮助 |
| q | 退出（关闭页面） |
| a / d | 存档页翻页 |
| b / Esc | 存档页返回 |
| `k` `y` `o` `n` | 秘籍：打开结局条件浏览页 |
