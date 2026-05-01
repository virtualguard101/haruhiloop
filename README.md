# Haruhi Loop CLI

Endless Eight inspired time-loop simulator CLI.

## Quick start (uv)

```bash
uv sync --extra dev
uv run haruhi start
```

The command prints a `run_id` like `a1b2c3d4`.

## Core commands

```bash
uv run haruhi step --run-id a1b2c3d4 --action observe_anomaly
uv run haruhi status --run-id a1b2c3d4
uv run haruhi history --run-id a1b2c3d4 --last 10
uv run haruhi replay --run-id a1b2c3d4
```

Optional simulation:

```bash
uv run haruhi simulate --runs 100 --max-steps 30 --policy greedy
```

## Actions

- `attend_class`
- `club_activity`
- `observe_anomaly`
- `collect_clue`
- `plan_festival`
- `complete_homework`
- `share_truth`
- `calm_haruhi`

## Endings

- `haruhi_happy_new_world`
- `kyon_breaks_loop`
- `shinirappears_unstable_world`

## Run tests

```bash
uv run pytest -q
```
