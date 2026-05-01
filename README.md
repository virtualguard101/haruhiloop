<div align="center">

# Haruhi Loop CLI

[English](README.md)
[简体中文](README_zh-CN.md)

A time-loop command-line simulator inspired by "The Endless August" from The Melancholy of Haruhi Suzumiya. 

</div>

Inspired by the "Endless August" motif from *The Melancholy of Haruhi Suzumiya*, this CLI simulates a time-loop scenario where the main character, Haruhi Suzumiya, repeatedly experiences the same day. The simulation is deterministic in `v0` version, meaning that the same initial state and action sequence will always produce the same outcome.


## Story-driven gameplay

This prototype turns key motifs from *The Melancholy of Haruhi Suzumiya* into a deterministic loop simulation:

- **Endless Eight loop pressure**: each cycle repeats a summer day split into `morning`, `afternoon`, and `evening`.
- **Haruhi's emotional influence**: `satisfaction` models Haruhi's mood. If boredom accumulates, reality becomes unstable.
- **Closed Space escalation**: low `stability` can trigger a Closed Space event, mirroring the series where emotional imbalance distorts the world.
- **Kyon-style subtle intervention**: you break the loop through small, cumulative choices (collecting clues, coordinating the group, and resolving unfinished tasks).
- **Alternative worldlines**: your trajectory can end in a successful new worldline, a clean loop break, or a collapse scenario where giant entities emerge.

Think of each command as “directing one episode turn” of the loop and each action as one intervention in the SOS Brigade timeline.

## Gameplay model

Each run tracks:

- `loop_count`: how many full day loops have occurred
- `satisfaction`: Haruhi's current mood level
- `stability`: worldline stability (risk of Closed Space)
- `clue_points`: how much evidence/preparation has accumulated
- `flags`: narrative milestones (for ending conditions)

The simulation is intentionally deterministic:

- same initial state + same action sequence = same outcome
- this supports replayability, balancing, and debugging

## Action narrative mapping

- `attend_class`: routine school day, low risk but little progress
- `club_activity`: SOS Brigade routine, can entertain Haruhi but may not solve the root cause
- `observe_anomaly`: investigate loop inconsistencies and hidden signs
- `collect_clue`: consolidate discoveries into actionable knowledge
- `plan_festival`: create meaningful novelty to counter boredom
- `complete_homework`: explicit nod to the Endless Eight trigger of unresolved summer tasks
- `share_truth`: synchronize team understanding of the loop
- `calm_haruhi`: emergency stabilization when instability is rising

## Endings and their narrative meaning

- `haruhi_happy_new_world`  
  Haruhi is satisfied and the group resolves key constraints, opening a healthier worldline.

- `kyon_breaks_loop`  
  The team accumulates enough subtle changes to finally escape repetition.

- `shinirappears_unstable_world`  
  Emotional and stability collapse leads to severe Closed Space consequences.

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

## Command reference

### `start`

Create a new run with deterministic initial values and print:

- current state metrics
- all available actions
- generated `run_id`

Examples:

```bash
uv run haruhi start
uv run haruhi start --run-id demo001
```

### `step`

Advance exactly one timeslot (`morning -> afternoon -> evening`) for an existing run.
This command applies:

1. action deltas
2. triggered event deltas
3. ending checks
4. time advancement

Required options:

- `--run-id`: target run
- `--action`: action id (one of the action list)

Example:

```bash
uv run haruhi step --run-id a1b2c3d4 --action collect_clue
```

### `status`

Show the latest persisted state for a run, including key metrics, flags, and current action list.

Example:

```bash
uv run haruhi status --run-id a1b2c3d4
```

### `history`

Read `history.jsonl` and display compact step logs.

Optional:

- `--last N`: only show the latest N steps

Examples:

```bash
uv run haruhi history --run-id a1b2c3d4
uv run haruhi history --run-id a1b2c3d4 --last 8
```

### `replay`

Replay the full run timeline and print a high-level summary of success/failure trend.

Example:

```bash
uv run haruhi replay --run-id a1b2c3d4
```

Optional simulation:

```bash
uv run haruhi simulate --runs 100 --max-steps 30 --policy greedy
```

Use simulation to compare strategy tendencies (for example, safety-first vs clue-first) and estimate ending distribution.

### `simulate`

Batch-run auto-play sessions without touching your manual runs.

Key options:

- `--runs`: number of simulation runs
- `--max-steps`: per-run step limit
- `--policy`: `random` or `greedy`

Example:

```bash
uv run haruhi simulate --runs 200 --max-steps 40 --policy random
```

## CLI help tips

```bash
uv run haruhi --help
uv run haruhi step --help
uv run haruhi simulate --help
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
