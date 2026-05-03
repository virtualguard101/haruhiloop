"""键盘驱动的本地感界面（Textual）：先选场景，再选选项，最后确认。"""

from __future__ import annotations

from pathlib import Path
import uuid

from rich.align import Align
from rich.console import Group
from rich.markup import escape
from rich.panel import Panel
from rich.text import Text

from textual import events
from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.containers import Container, VerticalScroll
from textual.screen import ModalScreen
from textual.widgets import Footer, Header, Static

from haruhiloop_cli.engine import GameEngine
from haruhiloop_cli.models import GameState, StepCommand, StepRecord
from haruhiloop_cli import storage, view
from haruhiloop_cli.ending_conditions_zh import DISPLAY_FOR_CHEAT

_CHEAT_CODE = "kyon"
_TUI_DEFAULT_MUTATOR_MODE = "ai"
_TUI_DEFAULT_AI_TEMPERATURE = 1.5
_ENTRY_ASCII_FALLBACK = "\n".join(
    [
        " _   _    _    ____  _   _ _   _ ___ _     ___   ___  ____  ",
        "| | | |  / \\  |  _ \\| | | | | | |_ _| |   / _ \\ / _ \\|  _ \\ ",
        "| |_| | / _ \\ | |_) | | | | |_| || || |  | | | | | | | |_) |",
        "|  _  |/ ___ \\|  _ <| |_| |  _  || || |__| |_| | |_| |  __/ ",
        "|_| |_/_/   \\_\\_| \\_\\\\___/|_| |_|___|_____\\___/ \\___/|_|    ",
    ]
)
_ENTRY_ASCII_PATH = Path(__file__).resolve().parents[1] / "assets" / "haruhi_ascii.txt"


def _load_entry_ascii() -> str:
    """Load entry art from scripts directory; fallback to built-in title."""
    try:
        art = _ENTRY_ASCII_PATH.read_text(encoding="utf-8").strip("\n")
    except OSError:
        return _ENTRY_ASCII_FALLBACK
    return art or _ENTRY_ASCII_FALLBACK


_ENTRY_ASCII = _load_entry_ascii()

_HELP_BODY = """\
[bold]数字键 1–9[/bold]  先选场景，再选该场景下的选项
[bold]Enter[/bold]  确认执行当前场景+选项
[bold]r[/bold]  重置当前预选（回到选场景）
[bold]n[/bold]  新开一局（随机运行标识）
[bold]v[/bold]  切换视图（混合叙事 / 详细数值）
[bold]q[/bold]  退出程序
[bold]h[/bold]  打开/关闭帮助（再按一次关闭）"""


def _toggle_view_mode(current: str) -> str:
    return "numeric" if current == "hybrid" else "hybrid"


def _view_mode_label(mode: str) -> str:
    return "混合叙事" if mode == "hybrid" else "详细数值"


class HaruhiPlayApp(App[None]):
    """无尽八月循环 — 键盘操作。"""

    TITLE = "Haruhi Loop"
    SUB_TITLE = ""

    CSS = """
    Screen { background: #1e1e2e; }
    #main { height: 1fr; border: tall $accent; padding: 0 1; }
    """

    BINDINGS = [
        Binding("q", "quit", "退出"),
        Binding("n", "new_game", "新局"),
        Binding("r", "reset_selection", "重置选择"),
        Binding("v", "toggle_view_mode", "视图"),
        Binding("h", "toggle_help", "帮助"),
        Binding("enter", "confirm_step", "确认"),
    ]

    def __init__(self) -> None:
        super().__init__()
        self.engine = GameEngine()
        self.run_id = ""
        self.state: GameState | None = None
        self._last_record: StepRecord | None = None
        self._welcome_done = False
        self._help_visible = False
        self._view_mode = "hybrid"
        self._selected_scene_id: str | None = None
        self._selected_scene_index: int | None = None
        self._selected_choice_id: str | None = None
        self._selected_choice_index: int | None = None
        self._previous_state_for_trend: GameState | None = None
        self._kyon_idx = 0
        self._quote_phase = 0
        self._clock_tick = 0
        self._transition_frames = 0
        self._last_day = 1
        self._last_loop_count = 1
        self._screen_mode = "entry"
        self._entry_save_slots: list[storage.SaveSlotSummary] = []
        self._load_page = 0

    def compose(self) -> ComposeResult:
        yield Header(show_clock=True)
        yield VerticalScroll(Static(id="main", expand=True))
        yield Footer()

    def on_mount(self) -> None:
        self.set_interval(0.7, self._tick_quote_phase)
        self._refresh_entry_save_slots()
        self._refresh_subtitle()
        self._refresh_main()

    def action_new_game(self) -> None:
        self.run_id = uuid.uuid4().hex[:8]
        self.state = self.engine.create_new_state(
            self.run_id,
            mutator_mode=_TUI_DEFAULT_MUTATOR_MODE,
            random_seed=None,
            ai_temperature=_TUI_DEFAULT_AI_TEMPERATURE,
        )
        self._last_record = None
        self._welcome_done = False
        self._help_visible = False
        self._view_mode = "hybrid"
        self._selected_scene_id = None
        self._selected_scene_index = None
        self._selected_choice_id = None
        self._selected_choice_index = None
        self._previous_state_for_trend = None
        self._kyon_idx = 0
        self._clock_tick = 0
        self._transition_frames = 0
        self._last_day = self.state.day
        self._last_loop_count = self.state.loop_count
        self._screen_mode = "game"
        storage.save_state(self.state)
        self._refresh_subtitle()
        self._refresh_main()

    def _refresh_entry_save_slots(self) -> None:
        self._entry_save_slots = storage.list_save_slots()
        max_page = max((len(self._entry_save_slots) - 1) // 9, 0)
        self._load_page = min(self._load_page, max_page)

    def _load_run(self, run_id: str) -> None:
        try:
            state = storage.load_state(run_id)
            history = storage.load_history(run_id)
        except (FileNotFoundError, ValueError) as exc:
            self.notify(f"加载存档失败：{exc}", severity="error", timeout=5)
            self._refresh_entry_save_slots()
            self._refresh_main()
            return
        self.run_id = run_id
        self.state = state
        self._last_record = history[-1] if history else None
        self._welcome_done = True
        self._help_visible = False
        self._view_mode = "hybrid"
        self._selected_scene_id = None
        self._selected_scene_index = None
        self._selected_choice_id = None
        self._selected_choice_index = None
        self._previous_state_for_trend = None
        self._kyon_idx = 0
        self._clock_tick = 0
        self._transition_frames = 0
        self._last_day = self.state.day
        self._last_loop_count = self.state.loop_count
        self._screen_mode = "game"
        self._load_page = 0
        self._refresh_subtitle()
        self._refresh_main()
        self.notify(f"已加载存档：{run_id}", timeout=3)

    def action_toggle_help(self) -> None:
        self._help_visible = not self._help_visible
        self._refresh_main()

    def action_toggle_view_mode(self) -> None:
        self._view_mode = _toggle_view_mode(self._view_mode)
        self._refresh_subtitle()
        self.notify(f"已切换为{_view_mode_label(self._view_mode)}视图", timeout=2.5)
        self._refresh_main()

    def action_reset_selection(self) -> None:
        self._selected_scene_id = None
        self._selected_scene_index = None
        self._selected_choice_id = None
        self._selected_choice_index = None
        self._refresh_main()

    def action_confirm_step(self) -> None:
        """Enter：仅有完整场景+选项预选且本局未结束时执行一步。"""
        if self._screen_mode == "entry":
            self.action_new_game()
            return
        if self._screen_mode == "load":
            return
        if self._selected_scene_id is None or self._selected_choice_id is None:
            return
        if self.state is None or self.state.is_finished:
            return
        if self._apply_step(self._selected_scene_id, self._selected_choice_id):
            self._selected_choice_id = None
            self._selected_choice_index = None
            self._refresh_main()
            if self.state.is_finished and self.state.ending_title:
                self.notify(
                    f"结局：{self.state.ending_title}。完整剧情见上方面板「结局剧情」。",
                    severity="information",
                    timeout=14,
                )
        else:
            self._refresh_main()

    def _apply_step(self, scene_id: str, choice_id: str) -> bool:
        """执行一步；成功返回 True，失败返回 False（预选保留）。"""
        if self.state is None:
            return False
        if self.state.is_finished:
            self.notify("本局已结束，按 n 开始新局", severity="warning")
            return False
        history = storage.load_history(self.run_id)
        step_no = len(history) + 1
        prev_day = self.state.day
        prev_loop_count = self.state.loop_count
        previous_state = GameState.from_dict(self.state.snapshot())
        try:
            result = self.engine.step(self.state, StepCommand(scene_id=scene_id, choice_id=choice_id), step_no)
        except ValueError as exc:
            self.notify(str(exc), severity="error")
            return False
        self._previous_state_for_trend = previous_state
        self._last_record = result.record
        self._welcome_done = True
        storage.append_history(self.run_id, result.record)
        storage.save_state(result.state)
        if self.state.day != prev_day or self.state.loop_count != prev_loop_count:
            self._transition_frames = 2
        self._last_day = self.state.day
        self._last_loop_count = self.state.loop_count
        return True

    def on_key(self, event: events.Key) -> None:
        ch = event.character
        if self._screen_mode == "entry":
            if ch and ch in "1234":
                event.stop()
                idx = int(ch)
                if idx == 1:
                    self.action_new_game()
                    return
                if idx == 2:
                    self._refresh_entry_save_slots()
                    self._screen_mode = "load"
                    self._refresh_subtitle()
                    self._refresh_main()
                    return
                if idx == 3:
                    self.action_toggle_help()
                    return
                if idx == 4:
                    self.exit()
                    return
            return
        if self._screen_mode == "load":
            if ch and ch in "123456789":
                event.stop()
                idx = int(ch)
                start = self._load_page * 9
                slots = self._entry_save_slots[start : start + 9]
                slot_idx = idx - 1
                if 0 <= slot_idx < len(slots):
                    self._load_run(slots[slot_idx].run_id)
                return
            if ch:
                low = ch.lower()
                if low == "a":
                    event.stop()
                    if self._load_page > 0:
                        self._load_page -= 1
                        self._refresh_main()
                    return
                if low == "d":
                    event.stop()
                    max_page = max((len(self._entry_save_slots) - 1) // 9, 0)
                    if self._load_page < max_page:
                        self._load_page += 1
                        self._refresh_main()
                    return
                if low == "b":
                    event.stop()
                    self._screen_mode = "entry"
                    self._refresh_subtitle()
                    self._refresh_main()
                    return
            if event.key == "escape":
                event.stop()
                self._screen_mode = "entry"
                self._refresh_subtitle()
                self._refresh_main()
            return
        if ch and ch in "123456789":
            self._kyon_idx = 0
            if self.state is None or self.state.is_finished:
                return
            event.stop()
            idx = int(ch)
            if self._selected_scene_id is None:
                scenes = self.engine.available_scenes(self.state)
                if 1 <= idx <= len(scenes):
                    scene = scenes[idx - 1]
                    self._selected_scene_id = scene.scene_id
                    self._selected_scene_index = idx
                    self._selected_choice_id = None
                    self._selected_choice_index = None
            else:
                choices = self.engine.available_choices(self.state, self._selected_scene_id)
                if 1 <= idx <= len(choices):
                    choice = choices[idx - 1]
                    self._selected_choice_id = choice.choice_id
                    self._selected_choice_index = idx
            self._refresh_main()
            return

        if ch and ch.isalpha():
            low = ch.lower()
            if low == "n" and self._kyon_idx == 3:
                self._kyon_idx = 0
                event.stop()
                event.prevent_default()
                self.push_screen(EndingCheatScreen(DISPLAY_FOR_CHEAT))
                return
            if low != "n":
                self._feed_kyon_partial(low)

    def _welcome_panel(self) -> Panel:
        body = (
            "[bold]简介[/bold]  同一天不断轮回；先选场景，再选选项，最后按 Enter 确认。\n"
            "[bold]操作[/bold]  [cyan]1–9[/cyan] 选场景/选项  ·  [cyan]r[/cyan] 重置预选  ·  [cyan]Enter[/cyan] 确认  ·  [cyan]n[/cyan] 新局  ·  "
            "[cyan]v[/cyan] 视图切换  ·  [cyan]q[/cyan] 退出  ·  [cyan]h[/cyan] 帮助\n"
            "[dim]方向键等扩展可在后续版本加入。[/dim]"
        )
        return Panel(body.strip(), title="开局说明", border_style="cyan")

    def _help_panel(self) -> Panel:
        body = f"""\
{_HELP_BODY}

[bold]当前视图[/bold]  {_view_mode_label(self._view_mode)}
[dim]混合叙事：隐藏底层系统参数，只显示档位与趋势；详细数值：完整指标与精确变化。[/dim]"""
        return Panel(
            body.strip(),
            title="帮助",
            border_style="magenta",
        )

    def _refresh_subtitle(self) -> None:
        if self._screen_mode == "entry":
            self.sub_title = "入口界面 | 1 新局 · 2 载入存档 · 3 帮助 · 4 退出"
            return
        if self._screen_mode == "load":
            max_page = max((len(self._entry_save_slots) - 1) // 9, 0) + 1
            self.sub_title = f"载入存档 | 页 {self._load_page + 1}/{max_page} · 1-9 加载 · A/D 翻页 · B 返回"
            return
        self.sub_title = f"运行 {self.run_id} | 视图 {_view_mode_label(self._view_mode)}"

    def _entry_panel(self) -> Panel:
        entry_ascii = escape(_ENTRY_ASCII)
        logo_ascii = escape(_ENTRY_ASCII_FALLBACK)
        menu_lines = [
            "[black on bright_cyan] 1 [/black on bright_cyan] [bold bright_white]开始新局[/bold bright_white] [dim]NEW LOOP[/dim]",
            "[black on plum2] 2 [/black on plum2] [bold bright_white]载入存档[/bold bright_white] [dim]LOAD GAME[/dim]",
            "[black on bright_magenta] 3 [/black on bright_magenta] [bold bright_white]查看帮助[/bold bright_white] [dim]HELP[/dim]",
            "[black on grey70] 4 [/black on grey70] [bold bright_white]退出游戏[/bold bright_white] [dim]EXIT[/dim]",
        ]
        sss_header = "[bold bright_yellow]★ SOS 团 · 特别活动室终端 ★[/bold bright_yellow]"
        gal_divider = "[bright_blue]━━━━━━━━━━━━━━━━━━━━━━━━━━━━[/bright_blue]"
        catch_copy_jp = "[italic bright_magenta]「ただの人間には興味ありません。」[/italic bright_magenta]"
        catch_copy_zh = "[dim]如果你是外星人、未来人、异世界人或超能力者，就来找我吧。[/dim]"
        menu_frame_top = "[bright_cyan]┏━━━━━━━━━━[/bright_cyan][bold] MAIN MENU [/bold][bright_cyan]━━━━━━━━━━┓[/bright_cyan]"
        menu_frame_bottom = "[bright_cyan]┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛[/bright_cyan]"
        body = Group(
            Align.center(Text.from_markup(f"[cyan]{entry_ascii}[/cyan]", justify="center")),
            Align.center(Text.from_markup(f"[cyan]{logo_ascii}[/cyan]", justify="center")),
            Align.center(Text.from_markup(sss_header, justify="center")),
            Align.center(Text.from_markup(gal_divider, justify="center")),
            Align.center(Text.from_markup("[bold]无尽八月循环模拟器[/bold]", justify="center")),
            Align.center(Text.from_markup(catch_copy_jp, justify="center")),
            Align.center(Text.from_markup(catch_copy_zh, justify="center")),
            Align.center(Text.from_markup("", justify="center")),
            Align.center(Text.from_markup(menu_frame_top, justify="center")),
            *[Align.center(Text.from_markup(line, justify="center")) for line in menu_lines],
            Align.center(Text.from_markup(menu_frame_bottom, justify="center")),
            # Align.center(
            #     Text.from_markup(
            #         "[dim]按 2 进入独立存档页[/dim]",
            #         justify="center",
            #     )
            # ),
        )
        return Panel(body, title="Haruhi Loop · Endless August", border_style="bright_cyan")

    def _load_panel(self) -> Panel:
        menu_frame_top = "[bright_cyan]┏━━━━━━━━━━[/bright_cyan][bold] LOAD GAME [/bold][bright_cyan]━━━━━━━━━━┓[/bright_cyan]"
        menu_frame_bottom = "[bright_cyan]┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛[/bright_cyan]"
        start = self._load_page * 9
        slots = self._entry_save_slots[start : start + 9]
        lines: list[str] = []
        for idx, slot in enumerate(slots, start=1):
            date_key = slot.modified_at.strftime("%Y%m%d")
            # Compute stable serial index among full save list by date.
            serial_index = 0
            for each in self._entry_save_slots:
                if each.modified_at.strftime("%Y%m%d") == date_key:
                    serial_index += 1
                if each.run_id == slot.run_id:
                    break
            save_no = f"{date_key}-{serial_index:02d}"
            state_label = (
                f"结局：{slot.ending_title or '已达成'}"
                if slot.is_finished
                else f"第{slot.day}天 · 第{slot.loop_count}周目"
            )
            stamp = slot.modified_at.strftime("%Y-%m-%d %H:%M")
            lines.append(
                f"[black on plum2] {idx} [/black on plum2] "
                f"[bold bright_white]{save_no}[/bold bright_white] "
                f"[dim]{stamp} · {slot.run_id} · {state_label}[/dim]"
            )
        if not lines:
            lines.append("[dim]暂无可加载存档。按 b 返回并选择开始新局。[/dim]")
        max_page = max((len(self._entry_save_slots) - 1) // 9, 0) + 1
        body = Group(
            Align.center(Text.from_markup("[bold bright_yellow]★ SOS 团 · 存档管理终端 ★[/bold bright_yellow]", justify="center")),
            Align.center(Text.from_markup("", justify="center")),
            Align.center(Text.from_markup(menu_frame_top, justify="center")),
            *[Align.center(Text.from_markup(line, justify="center")) for line in lines],
            Align.center(Text.from_markup(menu_frame_bottom, justify="center")),
            Align.center(
                Text.from_markup(
                    f"[dim]页码 {self._load_page + 1}/{max_page} · 1-9 加载 · A/D 翻页 · B 或 Esc 返回[/dim]",
                    justify="center",
                )
            ),
        )
        return Panel(body, title="Haruhi Loop · Save Select", border_style="bright_magenta")

    def _refresh_main(self) -> None:
        if self._screen_mode == "entry":
            self._refresh_entry_save_slots()
            parts: list = [self._entry_panel()]
            if self._help_visible:
                parts.append(self._help_panel())
            self.query_one("#main", Static).update(Group(*parts))
            return
        if self._screen_mode == "load":
            self._refresh_entry_save_slots()
            self.query_one("#main", Static).update(Group(self._load_panel()))
            return
        if self.state is None:
            return
        scenes = self.engine.available_scenes(self.state)
        if self._selected_scene_id and all(s.scene_id != self._selected_scene_id for s in scenes):
            self._selected_scene_id = scenes[0].scene_id if scenes else None
            self._selected_scene_index = 1 if scenes else None
            self._selected_choice_id = None
            self._selected_choice_index = None
        choices = self.engine.available_choices(self.state, self._selected_scene_id) if self._selected_scene_id else []
        selected_scene_label = "—"
        for s in scenes:
            if s.scene_id == self._selected_scene_id:
                selected_scene_label = s.label
                break
        selected_choice_label = "未选择"
        if self._selected_choice_id:
            for c in choices:
                if c.choice_id == self._selected_choice_id:
                    selected_choice_label = c.label
                    break
        visual_state = view.build_quote_visual_state(
            self.state,
            pulse_phase=self._quote_phase,
            transition_frames=self._transition_frames,
            clock_tick=self._clock_tick,
        )
        parts: list = []
        if self._help_visible:
            parts.append(self._help_panel())
        parts.append(view.make_worldline_status_panel(visual_state))
        parts.append(view.make_classic_quote_panel(visual_state))
        if not self._welcome_done:
            parts.append(self._welcome_panel())
        if self._last_record is not None:
            parts.append(view.make_step_panel(self._last_record, narrative_mode=self._view_mode == "hybrid"))
        if self._view_mode == "hybrid":
            parts.append(view.make_metric_table_hybrid(self.state, prev_state=self._previous_state_for_trend))
        else:
            parts.append(view.make_metric_table(self.state))
        breadcrumb = (
            f"当前场景：{selected_scene_label} | "
            f"预选选项：{selected_choice_label}"
        )
        parts.append(Panel(breadcrumb, title="选择状态", border_style="cyan"))
        scene_hl = self._selected_scene_index if not self.state.is_finished else None
        choice_hl = self._selected_choice_index if not self.state.is_finished else None
        parts.append(
            view.make_scene_selector_panel(scenes, highlight_index=scene_hl),
        )
        parts.append(
            view.make_choice_selector_panel(
                choices,
                scene_label=selected_scene_label,
                highlight_index=choice_hl,
            )
        )
        if self.state.is_finished:
            parts.append(
                Panel(
                    "本局已结束。按 [bold cyan]n[/bold cyan] 开始新局，或 [bold cyan]q[/bold cyan] 退出。",
                    border_style="yellow",
                    title="提示",
                ),
            )
        content = Group(*parts)
        self.query_one("#main", Static).update(content)

    def _tick_quote_phase(self) -> None:
        self._quote_phase = (self._quote_phase + 1) % 2
        self._clock_tick += 1
        if self._transition_frames > 0:
            self._transition_frames -= 1
        if self.state is not None:
            self._refresh_main()

    def _feed_kyon_partial(self, low: str) -> None:
        """累积 k→y→o；第四位须为 n（见 on_key 特判，避免与「新局」绑定冲突）。"""
        if self._kyon_idx >= 3:
            self._kyon_idx = 1 if low == _CHEAT_CODE[0] else 0
            return
        if low == _CHEAT_CODE[self._kyon_idx]:
            self._kyon_idx += 1
        else:
            self._kyon_idx = 1 if low == _CHEAT_CODE[0] else 0


class EndingCheatScreen(ModalScreen[None]):
    """作弊查看结局条件（开发向）。"""

    CSS = """
    EndingCheatScreen {
        align: center middle;
    }
    #cheat_wrap {
        width: 88%;
        max-height: 88%;
        border: thick $accent;
        background: $surface;
        padding: 1 2;
    }
    """

    def __init__(self, body: str) -> None:
        super().__init__()
        self._body = body

    def compose(self) -> ComposeResult:
        yield Container(
            VerticalScroll(
                Static(self._body, markup=True),
                Static("\n[dim]按任意键关闭[/dim]", markup=True),
            ),
            id="cheat_wrap",
        )

    def on_key(self, _event: events.Key) -> None:
        self.dismiss()


def run_play() -> None:
    HaruhiPlayApp().run()
