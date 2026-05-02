"""键盘驱动的本地感界面（Textual）：数字键预选，Enter 确认执行。"""

from __future__ import annotations

import uuid

from rich.console import Group
from rich.panel import Panel

from textual import events
from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.containers import Container, VerticalScroll
from textual.screen import ModalScreen
from textual.widgets import Footer, Header, Static

from haruhiloop_cli.engine import GameEngine
from haruhiloop_cli.models import GameState, StepRecord
from haruhiloop_cli import rules, storage, view
from haruhiloop_cli.ending_conditions_zh import DISPLAY_FOR_CHEAT

_CHEAT_CODE = "kyon"

_HELP_BODY = """\
[bold]数字键 1–8[/bold]  预选一行（表格中会反色高亮）；换数字即换高亮
[bold]Enter[/bold]  确认执行当前预选动作
[bold]n[/bold]  新开一局（随机运行标识）
[bold]q[/bold]  退出程序
[bold]h[/bold]  打开/关闭帮助（再按一次关闭）"""


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
        self._pending_index: int | None = None
        self._kyon_idx = 0

    def compose(self) -> ComposeResult:
        yield Header(show_clock=True)
        yield VerticalScroll(Static(id="main", expand=True))
        yield Footer()

    def on_mount(self) -> None:
        self.action_new_game()

    def action_new_game(self) -> None:
        self.run_id = uuid.uuid4().hex[:8]
        self.state = self.engine.create_new_state(self.run_id)
        self._last_record = None
        self._welcome_done = False
        self._help_visible = False
        self._pending_index = None
        self._kyon_idx = 0
        storage.save_state(self.state)
        self.sub_title = f"运行 {self.run_id}"
        self._refresh_main()

    def action_toggle_help(self) -> None:
        self._help_visible = not self._help_visible
        self._refresh_main()

    def action_confirm_step(self) -> None:
        """Enter：仅有预选且本局未结束时执行一步。"""
        if self._pending_index is None:
            return
        if self.state is None or self.state.is_finished:
            return
        idx = self._pending_index
        if self._apply_step(idx):
            self._pending_index = None
            self._refresh_main()
            if self.state.is_finished and self.state.ending_title:
                self.notify(
                    f"结局：{self.state.ending_title}。完整剧情见上方面板「结局剧情」。",
                    severity="information",
                    timeout=14,
                )
        else:
            self._refresh_main()

    def _apply_step(self, index: int) -> bool:
        """执行一步；成功返回 True，失败返回 False（预选保留）。"""
        if self.state is None:
            return False
        if self.state.is_finished:
            self.notify("本局已结束，按 n 开始新局", severity="warning")
            return False
        action_id = rules.resolve_action_ref(str(index))
        history = storage.load_history(self.run_id)
        step_no = len(history) + 1
        try:
            result = self.engine.step(self.state, action_id, step_no)
        except ValueError as exc:
            self.notify(str(exc), severity="error")
            return False
        self._last_record = result.record
        self._welcome_done = True
        storage.append_history(self.run_id, result.record)
        storage.save_state(result.state)
        return True

    def on_key(self, event: events.Key) -> None:
        ch = event.character
        if ch and ch in "12345678":
            self._kyon_idx = 0
            if self.state is None or self.state.is_finished:
                return
            event.stop()
            self._pending_index = int(ch)
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
            "[bold]简介[/bold]  同一天不断轮回；先按数字预选动作（反色高亮），再按 Enter 确认。\n"
            "[bold]操作[/bold]  [cyan]1–8[/cyan] 预选  ·  [cyan]Enter[/cyan] 确认  ·  [cyan]n[/cyan] 新局  ·  "
            "[cyan]q[/cyan] 退出  ·  [cyan]h[/cyan] 帮助\n"
            "[dim]方向键等扩展可在后续版本加入。[/dim]"
        )
        return Panel(body.strip(), title="开局说明", border_style="cyan")

    def _help_panel(self) -> Panel:
        return Panel(
            _HELP_BODY.strip(),
            title="帮助",
            border_style="magenta",
        )

    def _refresh_main(self) -> None:
        if self.state is None:
            return
        actions = self.engine.available_actions(self.state)
        parts: list = []
        if self._help_visible:
            parts.append(self._help_panel())
        if not self._welcome_done:
            parts.append(self._welcome_panel())
        if self._last_record is not None:
            parts.append(view.make_step_panel(self._last_record))
        parts.append(view.make_metric_table(self.state))
        hl = self._pending_index if not self.state.is_finished else None
        parts.append(
            view.make_action_table(
                actions,
                subtitle="（1–8 预选，Enter 确认）",
                highlight_index=hl,
            ),
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
