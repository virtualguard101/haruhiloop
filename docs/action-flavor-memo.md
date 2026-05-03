# 行动叙事文案（action flavor）备忘

本文记录 `src/haruhiloop_cli/action_flavor_zh.py` 与引擎挂载方式，便于后续加「特殊池」或调文案。**当前正文均为可迭代草稿，仍可继续优化语气、长度与触发边界。**

## 1. 目的

- 每步执行动作后，在 `StepRecord.action_flavor` 附一段**与数值/事件判定无关**的纯叙事反馈。
- CLI / TUI 经 `view.make_step_panel` 展示；不改变 `rules` 判定。

## 2. 常规池（默认）

- 覆盖 `rules.ORDERED_ACTION_IDS` 全部 **8** 个动作，每动作 **10** 条候选。
- **伪随机**：`SHA256(run_id + step_number + action_id + 该动作累计次数含本步 + optional random_seed)` → `random.Random` 取索引。
- **禁止三连相同**：对每个「动作 + 池类型」维护最近两次所选索引；若两次相同，第三次禁止再选该索引。
- 状态字段：`GameState.action_flavor_recent: dict[str, tuple[int, ...]]`  
  - 常规池 streak 键 = **动作 ID**（如 `社团活动`）。

## 3. 特殊文案统一版式（与常规一眼区分）

**凡走「台词向特殊池」的正文**（长门疲劳、朝比奈临界等；以后同类新增同规）须满足：

- **一行一句**：`人名：原话`（中文全角冒号 `：`）。可连续多行，多行即多句台词。
- **不要**：引号（不使用 `「」`/`""` 作转述包裹）、环境描写、动作提示、旁白（如「她停了一下」）。
- **只要**：角色直接说出来的话；可与常规段落的叙事体并置对比，形成一眼可辨的版式差异。

**例外：阿虚内心崩溃池**（见 §7）为**第一人称内心独白**，**无角色名前缀**；允许**整段用 `「」` 包一层**（与台词池区分）。

**例外：群像瞬间池**（见 §4）为**非对白体碎片**：一人一句、极短；**`人名｜碎片`**（竖线 `｜`，非全角冒号），五人不互答。

**文案仍可继续优化**（人名用全名/略称、句长、攻击性分寸等），但版式约束建议保留。

## 4. 群像瞬间特殊池

- **版式**：五行，**非对话**；每人一句从侧里砸过来的短碎片，用 **`春日｜…`** 形式（不用 `「」`、不用 `：` 接长对白）。
- **适用动作**：全部 **8** 个动作（终盘时干什么都像被全员嗓门同时顶住）。
- **触发条件**（满足**任一**即激活；读 `pick_action_flavor` 瞬间的 `state`，已结束局不触发）：
  - **晴空真结局跑道**（邻接 `haruhi_happy_new_world`）：`festival_plan` + `homework_done` + `truth_shared` 齐，`satisfaction>=76`，`crew_sync>=60`，`clue_points>=8`，`breakthrough` 类次数 ≥2，`coordination` 类次数 ≥1。
  - **共识温室邻近**：`hope_signal` + `truth_shared` + `homework_done`，`satisfaction>=65`，`stability>=50`，`clue_points>=8`，`coordination` 类次数 ≥2。
  - **切口与回声邻近**：`anomaly_seen` + `homework_done` + `truth_shared`，`clue_points>=11`，`investigation` ≥2，`coordination` ≥1，`stability>=44`。
  - **闭锁危机**：`closed_space_stage >= 2`。
  - **真相暴晒邻域**：已 `truth_shared`，`stability<=24`，`satisfaction>=36`，`closed_space_count>=1`。
  - **终盘日感**：`day>=12` 且已 `truth_shared` 与 `homework_done`，`crew_sync>=52`。
- **候选数量**：**5** 套碎片组（每组五行）。
- **streak 键**：全局固定 **`__ensemble_burst__`**（与动作 ID 解耦，避免终盘连点同一套三连）。
- **pool_tag**：`ensemble_burst`。
- **优先级**：在 **`pick_action_flavor` 内最前**；可压过长门疲劳、朝比奈临界、阿虚内心池（终盘叙事优先）。

## 5. 第一套特殊池：长门疲劳

- **触发条件**：`nagato_fatigue >= 80`（与结局用疲劳阈值 **96** 刻意错开：80–95 为「高压叙事」区间）。
- **适用动作**：仅 **`向长门核对异常`**、**`向长门借资料`**（与长门直接交互）。
- **候选数量**：**5** 条共享正文（两动作同一元组引用，避免维护两套雷同句）；每条为 **纯 `长门：` 台词块**。
- **streak 键**：`{动作ID}::nagato_fatigue`，与常规池索引**不混用**（避免 10 池与 5 池索引串台）。
- **种子**：`_flavor_seed` 增加 `pool_tag`（`normal` / `nagato_fatigue`），保证同一步下与常规池分流后不撞车。

## 6. 第二套特殊池：朝比奈临界

- **版式**：与 §3 相同，**仅 `朝比奈：` 台词行**；无引号、无环境/动作旁白。
- **适用动作**：仅 **`社团活动`**（团内现场最容易由她「先裂开一条缝」）。
- **触发条件**（满足其一即可；读取 **`pick_action_flavor` 调用瞬间**的 `state`，与 `engine.step` 内顺序一致）：
  - **`crew_sync <= 40`**：协同掉到「勉强凑在一起」以下，重复感先从她嘴里漏出来。（**注意**：此时 `apply_crew_sync` 尚未执行，本步「社团活动」带来的协同增量**不会**先计入；若希望「先加再判」，需调整 `engine.step` 顺序。群像池若同时满足则在群像池命中时不会落到本条。）
  - **`worldline_shift >= 58`**：偏移累积，感官细节开始「对不上号」。（同上，本步对世界线偏移的累加在 `pick_action_flavor` **之后**写入。）
  - 未用 `member_trust["mikuru"]`：当前实现里信任值几乎只增不减，不利于做「临界」阈值；若日后加衰减可再挂钩。
- **候选数量**：**5** 条。
- **streak 键**：`社团活动::mikuru_critical`；**pool_tag**：`mikuru_critical`。
- **优先级**：与长门疲劳池**互斥动作域**；若将来同一动作可命中多池，再在代码里规定先后（当前不会）。

## 7. 第三套特殊池：阿虚内心崩溃

- **版式**：**无前缀**（无 `阿虚：`）；一条候选通常为一整句 **「……」** 独白，与 §3 台词池例外说明一致。
- **适用动作**：`rules.ORDERED_ACTION_IDS` **全部 8 个动作**（压力上来时，干哪件事都像在脑子里打架）。
- **触发条件**：综合压力 `_kyon_collapse_pressure(state) >= 46`（`action_flavor_zh` 内实现）。压力由 **`stability`/`satisfaction` 偏低**、**`worldline_shift`/`nagato_fatigue`**、**`homework_progress`**、**`crew_sync` 偏低** 等加权累加并封顶；与 `pick_action_flavor` 调用瞬间的 `state` 一致（`worldline_shift` 仍为本步动作写入偏移**之前**的快照，与 §5 注同）。
- **可触发时的分流**：压力已达阈值后，**约 50%** 仍用该动作的**常规 10 条**，**约 50%** 进入阿虚「」档内池；由 `SHA256(run_id+step+action_id+kyon_inner_vs_normal[+seed])` 最低位决定（可复现）。
- **语气分档**（仍只由**触发时**状态决定，与具体动作 ID 无关）：压力 **未满 56** → 自我怀疑档；**56–77** → 自我厌恶档；**不低于 78** → 彻底摆烂档。每档 **5** 条候选；伪随机 + 三连禁的 streak 键为 **`{动作ID}::kyon_collapse_{0|1|2}`**，`pool_tag` 为 `kyon_collapse_0` 等。
- **优先级**：**在群像池之后、长门疲劳池、朝比奈临界池之后**。若未命中群像，则「社团活动」在朝比奈临界仍走朝比奈池；「向长门核对异常」在长门疲劳仍走长门池。

## 8. 引擎挂载点

- `engine.step`：在写入 `action_counts` / `category_counts` **之后**调用 `pick_action_flavor`。
- 此时 **`nagato_fatigue` 已含本步动作增量**；**`crew_sync` / `worldline_shift` 仍为本步后续事件与偏移累加之前**的快照（见 §6 注）。
- 返回值写入 `StepRecord.action_flavor`。

## 9. 存档兼容

- 旧存档仅有 `club_activity_flavor_recent` 时，`GameState.from_dict` 迁移为  
  `action_flavor_recent["社团活动"]`。
- 新 streak 若含 `::nagato_fatigue`、`::mikuru_critical` 等后缀键，随 `state.json` 一并 JSON 化（字符串键）。

## 10. 测试

- `tests/test_action_flavor.py`：十条约齐全、每动作一步有 flavor、社团三连禁、群像池触发/压过长门与朝比奈/三连禁、长门疲劳池阈值与三连禁、朝比奈临界触发与三连禁、阿虚内心池触发/优先级/分档/三连禁、旧字段迁移等。

## 11. 后续可扩展（未实现）

- 更多「特殊池」：可按 `flags` / 闭锁阶段 / 其它数值分支，在 `pick_action_flavor` 内增加 `pool_tag` 与独立 streak 后缀即可。
- **文案优化**：特殊池与常规池均可单独迭代；若调整阈值或动作范围，请同步本备忘与测试断言中的特征串（若有）。

## 12. 变更记录

- **初版**：8 动作 ×10 常规；伪随机 + 三连禁；`action_flavor_recent`。
- **增补**：`nagato_fatigue >= 80` 时「向长门核对异常 / 向长门借资料」切换 **5** 条疲劳向直白叙事；独立 streak 与 `pool_tag` 种子。
- **改版**：长门疲劳特殊池改为 **`长门：` 纯台词块**（无引号、无环境/动作描写），与常规叙事池版式区分；备忘增加「所有特殊池」统一格式约束。
- **增补**：**朝比奈临界**特殊池（`社团活动`；`crew_sync<=40` 或 `worldline_shift>=58`；5 条 `朝比奈：` 台词）；独立 streak 与 `pool_tag`。
- **增补**：**阿虚内心崩溃**池（8 动作；综合压力阈值 + 三档语气；5×3 条「」独白；优先级低于长门/朝比奈特殊池）。
- **增补**：**群像瞬间**池（8 动作；终盘/关键节点多条件；5 套 `人名｜` 碎片；全局 streak；**优先级最高**）。
- **改版**：阿虚「」池在压力已达阈值时，与**常规 10 条**约 **50%/50%** 分流（哈希可复现）。
