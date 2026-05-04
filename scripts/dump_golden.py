"""为 web 端 TS 移植生成 deterministic 模式下的 golden 状态序列。

用法（在 Python 项目根目录运行）：
    uv run python scripts/dump_golden.py

输出到 web/tests/golden/data/*.json，每个文件包含：
{
  "config": {...},
  "actions": [[scene_id, choice_id], ...],
  "steps": [
    {
      "before": {...snapshot...},
      "after": {...snapshot...},
      "events": [...],
      "mutation_profile": {...}
    },
    ...
  ],
  "final_state": {...snapshot...}
}

只在 mutator_mode = "deterministic" 模式下生成，因为 AI 模式
依赖 Python random.Random 的 Mersenne Twister，TS 用 mulberry32
不会产生相同序列（按计划这是允许的差异）。
"""
from __future__ import annotations

import json
from pathlib import Path

from haruhiloop_cli.engine import GameEngine
from haruhiloop_cli.models import StepCommand


SEQUENCES: list[dict] = [
    {
        "name": "deterministic_seed1_groupbriefing",
        "run_id": "G001",
        "seed": 1,
        "actions": [
            ("clubroom", "group_briefing"),
            ("library", "nagato_crosscheck"),
            ("home", "homework_focus"),
        ],
    },
    {
        "name": "deterministic_seed7_truthroute",
        "run_id": "G007",
        "seed": 7,
        "actions": [
            # 每 3 步一循环：morning → afternoon → evening
            ("clubroom", "haruhi_calm_talk"),  # morning
            ("library", "nagato_archives"),  # afternoon
            ("home", "group_call_sync"),  # evening
            ("clubroom", "surprise_pitch"),  # morning
            ("city", "koizumi_debrief"),  # afternoon
            ("riverside", "truth_discussion"),  # evening
            ("library", "solo_trace"),  # morning
            ("city", "koizumi_debrief"),  # afternoon
            ("home", "homework_focus"),  # evening
        ],
    },
    {
        "name": "deterministic_seed42_homework",
        "run_id": "G042",
        "seed": 42,
        "actions": [
            ("clubroom", "group_briefing"),
            ("library", "solo_trace"),
            ("home", "homework_focus"),
            ("clubroom", "group_briefing"),
            ("library", "solo_trace"),
            ("home", "homework_focus"),
            ("clubroom", "group_briefing"),
            ("library", "solo_trace"),
            ("home", "homework_focus"),
        ],
    },
]


def main() -> None:
    web_root = Path(__file__).resolve().parents[1] / "web"
    out_dir = web_root / "tests" / "golden" / "data"
    out_dir.mkdir(parents=True, exist_ok=True)
    engine = GameEngine()

    for cfg in SEQUENCES:
        state = engine.create_new_state(
            cfg["run_id"],
            mutator_mode="deterministic",
            random_seed=cfg["seed"],
            ai_temperature=0.0,
        )
        steps_payload: list[dict] = []
        for n, (scene_id, choice_id) in enumerate(cfg["actions"], start=1):
            result = engine.step(
                state,
                StepCommand(scene_id=scene_id, choice_id=choice_id),
                step_number=n,
            )
            steps_payload.append(
                {
                    "before": result.record.before,
                    "after": result.record.after,
                    "events": list(result.record.events),
                    "mutation_profile": result.record.mutation_profile,
                    "ending_id": result.record.ending_id,
                }
            )
        payload = {
            "config": {
                "name": cfg["name"],
                "run_id": cfg["run_id"],
                "seed": cfg["seed"],
                "mutator_mode": "deterministic",
                "ai_temperature": 0.0,
            },
            "actions": cfg["actions"],
            "steps": steps_payload,
            "final_state": state.snapshot(),
        }
        out_path = out_dir / f"{cfg['name']}.json"
        out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"wrote {out_path}")


if __name__ == "__main__":
    main()
