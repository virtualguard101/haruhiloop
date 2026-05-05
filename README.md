<div align="center">

# Haruhi Loop CLI

[English](README.md)
[简体中文](README_zh-CN.md)

A time-loop command-line simulator inspired by "The Endless August" from The Melancholy of Haruhi Suzumiya.

</div>

This project currently provides:

- a Typer-based CLI (`haruhi`)
- a Textual keyboard UI (`haruhi-play`)
- a TypeScript Web port at `web/` (xterm.js terminal UI, IndexedDB storage, no backend) — see [`web/README.md`](web/README.md)

The loop is state-driven and replayable. In deterministic mode, the same initial state plus the same action sequence yields the same result.

## Architecture

The project now uses a staged layered architecture:

- `interfaces`: CLI/TUI entrypoints and rendering adapters
- `application`: use-case orchestration (`start/step/status/replay/simulate`)
- `domain`: engine, rules, systems, and core models
- `infrastructure`: persistence adapters
- `narrative`: i18n and narrative text resources

See `docs/dev/arch.md` for the full architecture reference.

## Project structure

```text
.
├─ docs/
│  ├─ design.md
│  └─ dev/
│     ├─ arch.md
│     ├─ action-flavor-memo.md
│     └─ results.md
├─ scripts/
│  ├─ dump_golden.py
│  └─ get_utf8art.sh
├─ src/
│  ├─ assets/                     # ascii resources
│  └─ haruhiloop_cli/             # Python package (CLI/TUI + layered core)
├─ tests/                         # Python test suite
├─ web/                           # TypeScript web terminal port
├─ main.py                        # local launcher helper
├─ pyproject.toml
└─ README_zh-CN.md
```

## Gameplay model

Each run tracks:

- base: `day`, `timeslot(morning/afternoon/evening)`, `loop_count`, `satisfaction`, `stability`, `clue_points`, `flags`
- v0.3 systems: `homework_progress`, `crew_sync`, `closed_space_stage`, `memory_residue`
- merged storyline: `nagato_fatigue`, `ending_epilogue`
- v0.4 mutator: `mutator_mode`, `worldline_mutation_profile`

## Quick start

```bash
uv sync --extra dev
uv run haruhi start
uv run haruhi-play
```

Without `uv`:

```bash
pip install -e ".[dev]"
haruhi --help
haruhi-play
```

## Core CLI commands

Replace `RUN` with your run id.

```bash
uv run haruhi start
uv run haruhi start RUN
uv run haruhi start --mutator-mode ai --seed 42 --ai-temperature 0.9

uv run haruhi step RUN 3
uv run haruhi step RUN 向长门核对异常
uv run haruhi step RUN 观察异常

uv run haruhi status RUN
uv run haruhi history RUN --last 10
uv run haruhi replay RUN
uv run haruhi simulate --runs 100 --max-steps 30 --policy greedy
uv run haruhi simulate --runs 100 --policy random --mutator-mode ai --seed 7
```

Note: `观察异常` and `整合线索` remain supported as compatibility aliases.

## Endings (internal ids)

- `nagato_collapse`
- `haruhi_happy_new_world`
- `consensus_paradise`
- `kyon_breaks_loop`
- `meltdown_pact`
- `hollow_celebration`
- `archive_bound`
- `observer_bailout`
- `shinirappears_unstable_world`

## Persistence

`.haruhiloop_runs/<run_id>/` with `state.json` and `history.jsonl`.

## Run tests

```bash
uv run pytest -q
```
