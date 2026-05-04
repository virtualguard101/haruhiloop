// 与 view.py render_history / render_replay 对齐：历史表 + 回放小结。

import { GameState, StepRecord } from "../../../domain/models";
import { formatEndingSummary, formatTimeslot } from "../../../narrative/i18n";
import { renderTable } from "./table";
import { renderPanel } from "./panel";

export function renderHistoryTable(records: readonly StepRecord[], width: number, last?: number): string[] {
  const selected = last && last > 0 ? records.slice(-last) : records;
  if (selected.length === 0) {
    return renderPanel("尚无历史记录。", width, { title: "历史", borderColor: "blue" });
  }
  const rows = selected.map((item) => [
    String(item.step_number),
    `第${item.day}天·${formatTimeslot(item.timeslot)}`,
    `${item.scene_label} / ${item.choice_label}`,
    String(item.events.length),
    item.ending_id ? formatEndingSummary(item.ending_id) : "—",
  ]);
  return renderTable(
    {
      title: `历史（共 ${selected.length} 条）`,
      columns: [
        { header: "步数", align: "right" },
        { header: "日 / 时段" },
        { header: "场景/选择" },
        { header: "事件数", align: "right" },
        { header: "结局" },
      ],
      rows,
      borderColor: "blue",
      titleColor: "blue",
    },
    width,
  );
}

export function renderReplayBody(
  runId: string,
  state: GameState,
  records: readonly StepRecord[],
  width: number,
): string[] {
  const out: string[] = [];
  out.push(...renderPanel(`回放运行：${runId}`, width, { title: "回放", borderColor: "blue", titleColor: "blue" }));
  out.push(...renderHistoryTable(records, width));
  if (records.length > 0) {
    const latest = records[records.length - 1]!;
    let reason = "循环仍在继续。";
    if (latest.ending_id) {
      reason = `本局结束：${formatEndingSummary(latest.ending_id)}。`;
    } else if (state.stability < 25) {
      reason = "走势偏负：稳定度持续下滑。";
    } else if (state.satisfaction < 20) {
      reason = "走势偏负：春日满意度长期处于危险低位。";
    }
    out.push(...renderPanel(reason, width, { title: "小结", borderColor: "yellow", titleColor: "yellow" }));
  }
  return out;
}
