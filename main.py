"""从项目根目录启动键盘版界面：python main.py

需已安装依赖（含 textual），建议：uv sync 或 pip install -e ."""
from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent
_SRC = _ROOT / "src"
if _SRC.is_dir() and str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))


def main() -> None:
    from haruhiloop_cli.play_app import run_play

    run_play()


if __name__ == "__main__":
    main()
