<div align="center">

# Haruhi Loop CLI

[English](README.md)
[简体中文](README_zh-CN.md)

A time-loop command-line simulator inspired by "The Endless August" from The Melancholy of Haruhi Suzumiya.

</div>

Inspired by the "Endless August" motif from *The Melancholy of Haruhi Suzumiya*, this CLI simulates a time-loop scenario where the main character, Haruhi Suzumiya, repeatedly experiences the same day. The simulation is deterministic in `v0`: the same initial state and action sequence always yields the same outcome.

**Locale**: In-repo UX defaults to **Simplified Chinese** (panels, action names, Typer help). Internal keys in saves (`flags`, `ending_id`, etc.) stay ASCII for stability.

See [README_zh-CN.md](README_zh-CN.md) for the canonical CLI examples and action list.

## Story-driven gameplay

- **Endless Eight loop pressure**: each cycle repeats a summer day split into `morning`, `afternoon`, and `evening`.
- **Haruhi's emotional influence**: `satisfaction` models mood; boredom feeds instability.
- **Closed Space escalation**: low `stability` can trigger Closed Space events.
- **Kyon-style subtle intervention**: break the loop through small, cumulative choices.
- **Alternative worldlines**: new worldline, loop break, or collapse ending.

## Gameplay model

Each run tracks `loop_count`, `satisfaction`, `stability`, `clue_points`, and narrative `flags`.

## Quick start (uv)

```bash
uv sync --extra dev
uv run haruhi start
```

`start` prints a short intro, then the state panel and a **run id** to reuse.

Without `uv`: `pip install -e ".[dev]"`, then run `haruhi`.

## Core commands (positional)

Replace `RUN` with your run id.

```bash
uv run haruhi start
uv run haruhi start RUN              # optional custom id

uv run haruhi step RUN 3             # second arg: index 1–8
uv run haruhi step RUN 向长门核对异常   # or full Chinese action id

uv run haruhi status RUN
uv run haruhi history RUN --last 10
uv run haruhi replay RUN
uv run haruhi simulate --runs 100 --max-steps 30 --policy greedy
```

Eight actions are numbered 1–8 in the panel; IDs are Chinese phrases (see README_zh-CN).

## Endings (internal ids)

- `haruhi_happy_new_world`
- `kyon_breaks_loop`
- `shinirappears_unstable_world`

## Persistence

`.haruhi_runs/<run_id>/` with `state.json` and `history.jsonl` (relative to the working directory).

## Run tests

```bash
uv run pytest -q
```
