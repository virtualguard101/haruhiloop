# Haruhi Loop CLI

受《凉宫春日的忧郁》“漫无止境的八月”启发的时间循环命令行模拟器。

## 玩法与剧情对应

这个原型把《凉宫春日》里的关键设定映射为可操作的状态机：

- **八月循环压力**：每天固定为 `morning`、`afternoon`、`evening` 三个时段，循环反复发生。
- **春日情绪影响现实**：`satisfaction` 表示春日情绪，长期无聊会让世界线失稳。
- **闭锁空间升级**：`stability` 过低会触发闭锁空间事件，对应动画中情绪失衡导致现实扭曲。
- **阿虚式微调破局**：通过微小且持续的行动积累（找线索、协调队友、补完遗留事项）逐步改写结局。
- **多世界线结局**：可能进入“新世界线”、成功跳出循环，或滑向崩坏结局（神人出现）。

你可以把每条命令理解成“推进这一集剧情的一步”，把每次 action 理解成 SOS 团的一次干预。

## 核心状态模型

每局 run 会维护以下关键状态：

- `loop_count`：完整日循环次数
- `satisfaction`：春日当前情绪值
- `stability`：世界线稳定度（决定闭锁空间风险）
- `clue_points`：线索和准备度累计值
- `flags`：叙事里程碑标记（用于结局判定）

本模拟器默认采用确定性机制：

- 相同初始状态 + 相同行动序列 = 相同结果
- 便于复盘、调参与演示

## 行动与剧情含义

- `attend_class`：按部就班上课，风险低但推进有限
- `club_activity`：进行 SOS 团日常，能短期缓解无聊但未必治本
- `observe_anomaly`：观察异常，定位循环征兆
- `collect_clue`：整合线索，形成可执行信息
- `plan_festival`：制造真正“新鲜”的活动来对冲无聊
- `complete_homework`：致敬八月篇破局关键“暑假作业未完成”
- `share_truth`：向团队同步循环真相，统一行动策略
- `calm_haruhi`：在高风险阶段稳定春日情绪

## 结局与叙事解释

- `haruhi_happy_new_world`  
  春日情绪被满足，关键条件达成，世界线转入更健康的未来。

- `kyon_breaks_loop`  
  通过细小改变的持续累积，最终跳出重复日常。

- `shinirappears_unstable_world`  
  情绪与稳定度双重崩塌，闭锁空间灾害升级。

## 快速开始（uv）

```bash
uv sync --extra dev
uv run haruhi start
```

命令会输出一个 `run_id`，例如 `a1b2c3d4`。

## 核心命令

```bash
uv run haruhi step --run-id a1b2c3d4 --action observe_anomaly
uv run haruhi status --run-id a1b2c3d4
uv run haruhi history --run-id a1b2c3d4 --last 10
uv run haruhi replay --run-id a1b2c3d4
```

可选模拟：

```bash
uv run haruhi simulate --runs 100 --max-steps 30 --policy greedy
```

可用来比较不同策略倾向（例如“保稳定优先”与“冲线索优先”）及结局分布。

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

## 运行测试

```bash
uv run pytest -q
```
