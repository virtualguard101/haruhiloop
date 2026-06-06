"""Pyodide 端渲染驱动：用 Textual Pilot 模式跑完整 HaruhiPlayApp，
每一帧整屏（含 Header / Footer / Screen $accent 黄边框 / Static#main 内容）
渲染成 ANSI，与父项目终端跑 `haruhi-play` 看到的画面 byte-for-byte 等同。

ts 端通过 send_key / tick / render_frame / resize 4 个 async 接口驱动。
"""
from __future__ import annotations

import asyncio
import sys
from io import StringIO
from pathlib import Path

from rich.console import Console


# ---- 内部状态：Pilot context ----
_app = None
_pilot = None
_pilot_ctx = None
_current_size = (140, 50)


async def boot_textual_app(width: int, height: int) -> str:
    """启动 HaruhiPlayApp，进入 run_test(headless) 上下文。"""
    global _app, _pilot, _pilot_ctx, _current_size
    if _pilot is not None:
        return "already-booted"

    # 让 web_panels 等可被 import（备用，play_app 自己只用 view.py）
    if "/home/pyodide" not in sys.path:
        sys.path.insert(0, "/home/pyodide")

    # Pyodide 没有 termios（POSIX tty），textual 默认 LinuxDriver 会在
    # App.__init__ 阶段就尝试 import termios 报错。monkey-patch
    # App.get_driver_class 强制返回 HeadlessDriver，即使 super().__init__()
    # 触发 driver 解析也走 headless 分支。
    from textual.app import App
    from textual.drivers.headless_driver import HeadlessDriver

    App.get_driver_class = lambda self: HeadlessDriver

    from haruhiloop_cli.play_app import HaruhiPlayApp

    _app = HaruhiPlayApp()
    _current_size = (int(width), int(height))
    _pilot_ctx = _app.run_test(size=_current_size, headless=True)
    _pilot = await _pilot_ctx.__aenter__()
    # 让 on_mount + 首屏渲染发生
    await _pilot.pause()
    await _pilot.pause()
    return "booted"


async def send_key(key: str) -> None:
    """喂一个按键给 Textual app。key 是 textual.keys 的字符串
    （'1', 'enter', 'a', 'escape' 等）。"""
    if _pilot is None:
        return
    with _app._context():
        await _pilot.press(key)
        await _pilot.pause()


async def tick(seconds: float = 0.05) -> None:
    """空 await 一会儿，让 set_interval / quote pulse 等定时器推进。"""
    if _pilot is None:
        return
    with _app._context():
        await _pilot.pause(seconds)


async def scroll(direction: str, amount: int = 3) -> None:
    """通过 VerticalScroll 容器滚动 #main 内容区。
    direction: 'up' / 'down' / 'home' / 'end'
    amount:    滚动行数（仅对 up/down 有效）
    """
    if _pilot is None or _app is None:
        return
    from textual.containers import VerticalScroll

    with _app._context():
        try:
            sv = _app.query_one(VerticalScroll)
        except Exception:
            return
        if direction == "down":
            sv.scroll_down(animate=False)
            for _ in range(max(0, int(amount) - 1)):
                sv.scroll_down(animate=False)
        elif direction == "up":
            sv.scroll_up(animate=False)
            for _ in range(max(0, int(amount) - 1)):
                sv.scroll_up(animate=False)
        elif direction == "home":
            sv.scroll_home(animate=False)
        elif direction == "end":
            sv.scroll_end(animate=False)
        await _pilot.pause()


async def resize(width: int, height: int) -> None:
    """通知 Textual app 终端尺寸变化，触发 layout 重算 + compositor cuts 失效。

    Pyodide 单线程 asyncio + headless 模式下，textual 的 set_timer(1/120,
    _check_resize) 经常在我们调 render_frame 前还没 fire，导致 compositor
    的 _cuts 缓存仍按旧尺寸；表现为：app.size / screen.size / compositor.size
    全部正确，但 render_strips() 仍按旧 height 输出（cuts 缓存陈旧）。
    所以这里直接拉两步：
      1. Pilot.resize_terminal —— 同步更新 driver._size 并 post Resize event
      2. screen._refresh_layout(size) —— 立刻同步重算 widget tree 与 compositor.cuts
    """
    global _current_size
    if _pilot is None:
        return
    new_size = (int(width), int(height))
    if new_size == _current_size:
        return
    _current_size = new_size
    from textual.geometry import Size

    size = Size(*new_size)
    with _app._context():
        await _pilot.resize_terminal(int(width), int(height))
        # 直接强制 screen 重新 layout —— 不等 timer
        try:
            _app.screen._refresh_layout(size)
        except Exception:
            pass
        await _pilot.pause()


async def render_frame(width: int = 0, height: int = 0) -> str:
    """渲染当前帧为 ANSI 字符串。可选传入新尺寸顺便 resize。

    必须包在 _app._context() 里 —— textual 的 widget render 路径会
    通过 ContextVar `active_app` 拿当前 app；Pyodide 每次 runPythonAsync
    创建新的 asyncio task，ContextVar 没继承，跳过 _context() 会报
    `LookupError: <ContextVar name='active_app'>`。

    渲染：用 Strip.render(console) 直接拼 ANSI，**不走 Console.print** ——
    后者会触发 Rich 的自动换行（按 console.width wrap），把单条 strip 拆成多行，
    导致整帧总行数远多于 screen.height。Strip 已经按 width crop / pad 过，
    只需照样拼出来再加 \n 即可。
    """
    if _pilot is None:
        return ""
    if width and height:
        await resize(width, height)
    w = _current_size[0]
    h = _current_size[1]
    with _app._context():
        strips = _app.screen._compositor.render_strips()
    # Console 只用于颜色系统 / 主题；不调 print 不会做 wrap
    console = Console(
        force_terminal=True,
        color_system="truecolor",
        width=w,
        record=False,
        soft_wrap=False,
    )
    parts: list[str] = []
    for strip in strips[:h]:
        parts.append(strip.render(console))
        parts.append("\n")
    return "".join(parts)


def ping() -> str:
    """启动健康检查。"""
    return "pyodide-textual-ready"
