from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from haruhiloop_cli.models import CURRENT_SCHEMA_VERSION, GameState, StepRecord

DATA_DIRNAME = ".haruhiloop_runs"


@dataclass(slots=True)
class SaveSlotSummary:
    run_id: str
    modified_at: datetime
    day: int
    loop_count: int
    is_finished: bool
    ending_title: str | None = None


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
        raise FileNotFoundError(f"未找到运行记录：{run_id}")
    payload = json.loads(path.read_text(encoding="utf-8"))
    schema_version = int(payload.get("schema_version", 0))
    if schema_version != CURRENT_SCHEMA_VERSION:
        raise ValueError(
            f"运行 {run_id} 的存档版本为 {schema_version}，当前只支持 {CURRENT_SCHEMA_VERSION}。"
        )
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


def list_save_slots(base_dir: Path | None = None) -> list[SaveSlotSummary]:
    """Return loadable save slots sorted by last modified time (newest first)."""
    target = data_dir(base_dir=base_dir)
    if not target.exists():
        return []
    slots: list[SaveSlotSummary] = []
    for child in target.iterdir():
        if not child.is_dir():
            continue
        state_file = child / "state.json"
        if not state_file.exists():
            continue
        try:
            payload = json.loads(state_file.read_text(encoding="utf-8"))
            schema_version = int(payload.get("schema_version", 0))
            if schema_version != CURRENT_SCHEMA_VERSION:
                continue
            state = GameState.from_dict(payload)
        except (OSError, ValueError, TypeError, json.JSONDecodeError):
            continue
        slots.append(
            SaveSlotSummary(
                run_id=state.run_id,
                modified_at=datetime.fromtimestamp(state_file.stat().st_mtime),
                day=state.day,
                loop_count=state.loop_count,
                is_finished=state.is_finished,
                ending_title=state.ending_title,
            )
        )
    slots.sort(key=lambda slot: slot.modified_at, reverse=True)
    return slots
