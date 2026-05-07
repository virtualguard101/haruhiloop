"""Web 端 Pyodide 加载的 panel 工厂模块。

把 play_app.py 中 _entry_panel / _load_panel / _help_panel / _welcome_panel
等几个**只用 Rich、不依赖 Textual**的方法抽出来，作为独立函数。
保持视觉与原版完全一致；web 端通过 Pyodide 调用拿到 Rich 渲染的 ANSI 字符串。
"""
from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Iterable

from rich.align import Align
from rich.console import Group
from rich.markup import escape
from rich.panel import Panel
from rich.text import Text


# ---- ENTRY 入口屏 ----

_ENTRY_ASCII_FALLBACK = "\n".join(
    [
        " _   _    _    ____  _   _ _   _ ___ _     ___   ___  ____  ",
        "| | | |  / \\  |  _ \\| | | | | | |_ _| |   / _ \\ / _ \\|  _ \\ ",
        "| |_| | / _ \\ | |_) | | | | |_| || || |  | | | | | | | |_) |",
        "|  _  |/ ___ \\|  _ <| |_| |  _  || || |__| |_| | |_| |  __/ ",
        "|_| |_/_/   \\_\\_| \\_\\\\___/|_| |_|___|_____\\___/ \\___/|_|    ",
    ]
)


def _load_entry_ascii() -> str:
    """从 /home/pyodide/assets/ 加载完整 ASCII art；失败回退到内置 logo。"""
    candidates = [
        Path("/home/pyodide/assets/haruhi_ascii.txt"),
        Path("/assets/haruhi_ascii.txt"),
    ]
    for path in candidates:
        try:
            text = path.read_text(encoding="utf-8").strip("\n")
            if text:
                return text
        except OSError:
            continue
    return _ENTRY_ASCII_FALLBACK


_ENTRY_ASCII = _load_entry_ascii()


def make_entry_panel() -> Panel:
    """与 play_app.HaruhiPlayApp._entry_panel byte-for-byte 等同。"""
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
    )
    return Panel(body, title="Haruhi Loop · Endless August", border_style="bright_cyan")


# ---- LOAD 存档管理屏 ----


def make_load_panel(slots: list[dict], page: int) -> Panel:
    """与 play_app.HaruhiPlayApp._load_panel 等同。
    slots 形如 [{run_id, day, loop_count, is_finished, ending_title, modified_at_iso}, ...]
    """
    menu_frame_top = "[bright_cyan]┏━━━━━━━━━━[/bright_cyan][bold] LOAD GAME [/bold][bright_cyan]━━━━━━━━━━┓[/bright_cyan]"
    menu_frame_bottom = "[bright_cyan]┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛[/bright_cyan]"
    start = page * 9
    visible = slots[start : start + 9]
    lines: list[str] = []
    for idx, slot in enumerate(visible, start=1):
        modified_at = _parse_iso(slot.get("modified_at_iso", ""))
        date_key = modified_at.strftime("%Y%m%d") if modified_at else "????????"
        # 计算同日累计序号（与 Python 原版一致：从前向后扫，遇到自己时停）
        serial = 0
        for each in slots:
            ea = _parse_iso(each.get("modified_at_iso", ""))
            if ea and ea.strftime("%Y%m%d") == date_key:
                serial += 1
            if each.get("run_id") == slot.get("run_id"):
                break
        save_no = f"{date_key}-{serial:02d}"
        is_finished = bool(slot.get("is_finished", False))
        if is_finished:
            state_label = f"结局：{slot.get('ending_title') or '已达成'}"
        else:
            state_label = f"第{slot.get('day', 1)}天 · 第{slot.get('loop_count', 1)}周目"
        stamp = modified_at.strftime("%Y-%m-%d %H:%M") if modified_at else "????-??-?? ??:??"
        lines.append(
            f"[black on plum2] {idx} [/black on plum2] "
            f"[bold bright_white]{escape(save_no)}[/bold bright_white] "
            f"[dim]{escape(stamp)} · {escape(slot.get('run_id', ''))} · {escape(state_label)}[/dim]"
        )
    if not lines:
        lines.append("[dim]暂无可加载存档。按 b 返回并选择开始新局。[/dim]")
    max_page = max((len(slots) - 1) // 9, 0) + 1 if slots else 1
    body = Group(
        Align.center(Text.from_markup("[bold bright_yellow]★ SOS 团 · 存档管理终端 ★[/bold bright_yellow]", justify="center")),
        Align.center(Text.from_markup("", justify="center")),
        Align.center(Text.from_markup(menu_frame_top, justify="center")),
        *[Align.center(Text.from_markup(line, justify="center")) for line in lines],
        Align.center(Text.from_markup(menu_frame_bottom, justify="center")),
        Align.center(
            Text.from_markup(
                f"[dim]页码 {page + 1}/{max_page} · 1-9 加载 · A/D 翻页 · B 或 Esc 返回[/dim]",
                justify="center",
            )
        ),
    )
    return Panel(body, title="Haruhi Loop · Save Select", border_style="bright_magenta")


def _parse_iso(iso: str) -> datetime | None:
    if not iso:
        return None
    try:
        # 接受 'YYYY-MM-DDTHH:MM:SS' / 含时区 / .fff 等
        return datetime.fromisoformat(iso.replace("Z", "+00:00"))
    except ValueError:
        return None


# ---- HELP / WELCOME / BREADCRUMB / NOTICE ----

_HELP_BODY = """\
[bold]数字键 1–9[/bold]  先选场景，再选该场景下的选项
[bold]Enter[/bold]  确认执行当前场景+选项
[bold]r[/bold]  重置当前预选（回到选场景）
[bold]n[/bold]  新开一局（随机运行标识）
[bold]v[/bold]  切换视图（混合叙事 / 详细数值）
[bold]q[/bold]  退出程序
[bold]h[/bold]  打开/关闭帮助（再按一次关闭）"""


def _view_mode_label(mode: str) -> str:
    return "混合叙事" if mode == "hybrid" else "详细数值"


def make_help_panel(view_mode: str) -> Panel:
    body = f"""\
{_HELP_BODY}

[bold]当前视图[/bold]  {_view_mode_label(view_mode)}
[dim]混合叙事：隐藏底层系统参数，只显示档位与趋势；详细数值：完整指标与精确变化。[/dim]"""
    return Panel(body.strip(), title="帮助", border_style="magenta")


def make_welcome_panel() -> Panel:
    body = (
        "[bold]简介[/bold]  同一天不断轮回；先选场景，再选选项，最后按 Enter 确认。\n"
        "[bold]操作[/bold]  [cyan]1–9[/cyan] 选场景/选项  ·  [cyan]r[/cyan] 重置预选  ·  [cyan]Enter[/cyan] 确认  ·  [cyan]n[/cyan] 新局  ·  "
        "[cyan]v[/cyan] 视图切换  ·  [cyan]q[/cyan] 退出  ·  [cyan]h[/cyan] 帮助\n"
        "[dim]方向键等扩展可在后续版本加入。[/dim]"
    )
    return Panel(body.strip(), title="开局说明", border_style="cyan")


def make_breadcrumb_panel(scene_label: str, choice_label: str) -> Panel:
    body = f"当前场景：{escape(scene_label)} | 预选选项：{escape(choice_label)}"
    return Panel(body, title="选择状态", border_style="cyan")


def make_closed_space_warning_panel() -> Panel:
    return Panel(
        "闭锁空间处于活跃阶段：优先尝试「安抚春日」或「同步循环真相」以压制扩张。",
        title="危机提示",
        border_style="red",
    )


def make_ended_notice_panel() -> Panel:
    return Panel(
        "本局已结束。按 [bold cyan]n[/bold cyan] 开始新局，或 [bold cyan]q[/bold cyan] 退出。",
        title="提示",
        border_style="yellow",
    )


def make_notice_panel(message: str) -> Panel:
    return Panel(
        f"[bold bright_yellow]{escape(message)}[/bold bright_yellow]",
        title="提示",
        border_style="yellow",
    )


# ---- CHEAT 结局速查 ----

_CHEAT_ENTRIES = [
    ("0", "长门有希的崩坏（暗线优先）", [
        "长门路线推进过深且持续高负荷，最终先于世界崩裂。",
        "长门疲劳度 ≥ 96，且长门路线进度 ≥ 6",
    ]),
    ("1", "晴空下的新周目", [
        "春日路线与真相路线同步推进，团队在高协同下撬开循环。",
        "春日路线 ≥ 6、真相路线 ≥ 4、春日好感 ≥ 62",
        "满意度 ≥ 85、线索 ≥ 10、团员协同 ≥ 65",
        "标记要求：惊喜活动计划、暑假作业已完成、已向众人揭示循环、已安抚春日情绪",
    ]),
    ("2", "共识温室", [
        "古泉路线主导的共识机制压住波动，形成温和闭环。",
        "古泉路线 ≥ 4，真相路线 ≥ 3",
        "满意度 ≥ 68、稳定度 ≥ 52、线索 ≥ 9",
        "需同时具备叙事标记：希望信号、已向众人揭示循环、暑假作业已完成",
    ]),
    ("3", "切口与回声", [
        "真相线推进到深层，并与长门线形成互补突破。",
        "真相路线 ≥ 5、长门路线 ≥ 3",
        "线索 ≥ 12、稳定度 ≥ 45、团员协同 ≥ 55",
        "需同时具备叙事标记：已察觉异常、暑假作业已完成、已向众人揭示循环",
    ]),
    ("4", "真相暴晒协议", [
        "真相路线推进过快导致系统过载。",
        "真相路线 ≥ 4，路线张力 ≥ 6",
        "需已向众人揭示循环；稳定度 ≤ 20；满意度 ≥ 38；闭锁空间次数 ≥ 1",
    ]),
    ("5", "空洞庆典", [
        "春日线高度推进但回避核心真相，庆典后只剩空转。",
        "春日路线 ≥ 5",
        "需有叙事标记「惊喜活动计划」，且未「已向众人揭示循环」；满意度 ≥ 76；线索 ≤ 7",
    ]),
    ("6", "归档囚徒", [
        "长门线深挖资料到极限，却失去脱离循环的窗口。",
        "长门路线 ≥ 5",
        "线索 ≥ 16；稳定度在 (0, 38] 区间",
        "需同时具备叙事标记：已察觉异常、线索链已展开、已向众人揭示循环",
    ]),
    ("7", "观测者脱钩", [
        "你看清了异常却与主线人群脱节，只能以旁观者姿态抽离。",
        "真相路线 ≥ 2",
        "世界线偏移 ≥ 48；线索 ≥ 9；满意度 ≤ 52；需已「已察觉异常」",
    ]),
    ("8", "结构体崩解", [
        "情绪与稳定度双重失控，闭锁空间扩张到不可收拾。",
        "稳定度 ≤ 0；或 闭锁空间阶段 ≥ 3；或（满意度 ≤ 5 且 闭锁空间次数 ≥ 2）",
    ]),
]


def make_cheat_panel() -> Panel:
    lines: list[str] = ["[bold]当前版本结局条件[/bold]（场景+选项驱动；判定自上而下，先命中先结算）", ""]
    for idx, title, items in _CHEAT_ENTRIES:
        lines.append(f"[bold cyan]{idx}.[/bold cyan] [bold]{escape(title)}[/bold]")
        for item in items:
            lines.append(f"  · {escape(item)}")
        lines.append("")
    lines.append("[dim]叙事为原创向群像寓言，不必对应单一原作剧情。[/dim]")
    lines.append("[dim]按任意键关闭。[/dim]")
    return Panel("\n".join(lines), title="Haruhi Loop · 结局条件速查", border_style="yellow")


def _iter_renderables(*objs) -> Iterable:
    """把传入的若干 Renderable 串成 Group。"""
    yield from objs
