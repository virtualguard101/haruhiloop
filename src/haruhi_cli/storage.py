from __future__ import annotations

import json
from pathlib import Path

from haruhi_cli.models import GameState, StepRecord

DATA_DIRNAME = ".haruhi_runs"


def data_dir(base_dir: Path | None = None) -> Path:
    base = base_dir or Path.cwd()
    target = base / DATA_DIRNAME
    target.mkdir(parents=True, exist_ok=True)
    return target


def run_dir(run_id: str, base_dir: Path | None = None) -> Path:
    target = data_dir(base_dir=base_dir) / run_id
    target.mkdir(parents=True, exist_ok=True)
    return target


def state_path(run_id: str, base_dir: Path | None = None) -> Path:
    return run_dir(run_id, base_dir=base_dir) / "state.json"


def history_path(run_id: str, base_dir: Path | None = None) -> Path:
    return run_dir(run_id, base_dir=base_dir) / "history.jsonl"


def save_state(state: GameState, base_dir: Path | None = None) -> None:
    path = state_path(state.run_id, base_dir=base_dir)
    path.write_text(json.dumps(state.snapshot(), ensure_ascii=True, indent=2), encoding="utf-8")


def load_state(run_id: str, base_dir: Path | None = None) -> GameState:
    path = state_path(run_id, base_dir=base_dir)
    if not path.exists():
        raise FileNotFoundError(f"Run not found: {run_id}")
    payload = json.loads(path.read_text(encoding="utf-8"))
    return GameState.from_dict(payload)


def append_history(run_id: str, record: StepRecord, base_dir: Path | None = None) -> None:
    path = history_path(run_id, base_dir=base_dir)
    with path.open("a", encoding="utf-8") as fp:
        fp.write(json.dumps(record.to_dict(), ensure_ascii=True) + "\n")


def load_history(run_id: str, base_dir: Path | None = None) -> list[StepRecord]:
    path = history_path(run_id, base_dir=base_dir)
    if not path.exists():
        return []
    records: list[StepRecord] = []
    with path.open("r", encoding="utf-8") as fp:
        for raw in fp:
            raw = raw.strip()
            if not raw:
                continue
            records.append(StepRecord.from_dict(json.loads(raw)))
    return records
