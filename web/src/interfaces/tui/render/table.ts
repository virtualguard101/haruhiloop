// 等宽表渲染（用于 metric / history）。
// 风格类似 Rich Table：列宽在内容自然宽度与 totalWidth 之间自适应；
// 单元格超过列宽时按可见宽度换行成多个物理行（保留外层 ANSI 包裹样式）。

import {
  isWide,
  padRightVisible,
  sliceByVisibleWidth,
  style,
  RESET,
  visibleWidth,
  wrap,
  wrapToWidth,
} from "./ansi";

export interface ColumnSpec {
  header: string;
  align?: "left" | "right";
  minWidth?: number;
}

export interface TableOptions {
  title?: string;
  columns: ColumnSpec[];
  rows: string[][];
  /** 标记需要反白高亮的行索引（0-based） */
  highlightRow?: number | null;
  /** 整张表标题色 */
  titleColor?: string;
  /** 整张表边框色 */
  borderColor?: string;
}

const SEP = " │ ";

export function renderTable(opts: TableOptions, totalWidth: number): string[] {
  const cols = opts.columns;
  if (cols.length === 0) return [];
  const sepTotal = SEP.length * (cols.length - 1);
  // 整张表对齐到 totalWidth：
  //   topFill = totalWidth - 2  （减去两端 ┏ ┓）
  //   cellsBudget = totalWidth - 4 - sepTotal （减去两端边框 + 两侧 padding + 列分隔符）
  const topFill = Math.max(20, totalWidth - 2);
  const cellsBudget = Math.max(8, totalWidth - 4 - sepTotal);

  // 自然宽度（按内容最长行计算）
  const natural = cols.map((c, i) => {
    let w = visibleWidth(c.header);
    for (const row of opts.rows) {
      w = Math.max(w, visibleWidth(row[i] ?? ""));
    }
    return Math.max(w, c.minWidth ?? 1);
  });
  const headerMin = cols.map((c) =>
    Math.max(1, visibleWidth(c.header), c.minWidth ?? 1),
  );

  const widths = [...natural];
  let sum = widths.reduce((a, b) => a + b, 0);
  if (sum <= cellsBudget) {
    // 余量给最后一列，让表占满 totalWidth
    const lastIdx = widths.length - 1;
    widths[lastIdx] = (widths[lastIdx] ?? 0) + (cellsBudget - sum);
  } else {
    // 自然宽度超预算：从最宽且仍可压缩的列里 -1，直到合规
    let safety = 5000;
    while (sum > cellsBudget && safety-- > 0) {
      let bestIdx = -1;
      let bestSlack = 0;
      for (let i = 0; i < widths.length; i++) {
        const slack = (widths[i] ?? 0) - (headerMin[i] ?? 1);
        if (slack > bestSlack) {
          bestSlack = slack;
          bestIdx = i;
        }
      }
      if (bestIdx === -1) break;
      widths[bestIdx] = (widths[bestIdx] ?? 0) - 1;
      sum -= 1;
    }
    // 如仍超预算（例如某列 header 比预算还宽），强行截到 cellsBudget 内
    sum = widths.reduce((a, b) => a + b, 0);
    while (sum > cellsBudget) {
      let maxIdx = 0;
      for (let i = 1; i < widths.length; i++) {
        if ((widths[i] ?? 0) > (widths[maxIdx] ?? 0)) maxIdx = i;
      }
      if ((widths[maxIdx] ?? 0) <= 1) break;
      widths[maxIdx] = (widths[maxIdx] ?? 0) - 1;
      sum -= 1;
    }
  }

  const border = opts.borderColor ?? "white";
  const open = style({ fg: border });

  const lines: string[] = [];
  const titleStr = opts.title
    ? wrap(opts.title, { fg: opts.titleColor ?? "default", bold: true })
    : "";
  lines.push(buildBorder("┏", "━", "┓", topFill, titleStr, open));

  // 表头
  const headerCells = cols.map((c, i) =>
    formatCell(wrap(c.header, { bold: true }), widths[i] ?? 0, c.align ?? "left"),
  );
  lines.push(`${open}┃${RESET} ${headerCells.join(SEP)} ${open}┃${RESET}`);
  lines.push(`${open}┠${"─".repeat(topFill)}┨${RESET}`);

  // 数据行：每个 cell 按列宽换行成多个物理行
  opts.rows.forEach((row, idx) => {
    const wrappedCells: string[][] = cols.map((_c, i) => {
      const w = widths[i] ?? 0;
      const text = row[i] ?? "";
      const segs = wrapToWidth(text, w);
      return segs.length === 0 ? [""] : segs;
    });
    const physicalLines = Math.max(1, ...wrappedCells.map((c) => c.length));
    for (let li = 0; li < physicalLines; li++) {
      const cells = cols.map((c, i) => {
        const seg = wrappedCells[i]?.[li] ?? "";
        return formatCell(seg, widths[i] ?? 0, c.align ?? "left");
      });
      let body = ` ${cells.join(SEP)} `;
      if (opts.highlightRow === idx) {
        body = wrap(body, { reverse: true, bold: true });
      }
      lines.push(`${open}┃${RESET}${body}${open}┃${RESET}`);
    }
  });

  lines.push(`${open}┗${"━".repeat(topFill)}┛${RESET}`);
  return lines;
}

function formatCell(value: string, width: number, align: "left" | "right"): string {
  const visible = visibleWidth(value);
  if (visible > width) {
    // 已经是 wrapToWidth 之后的单段，超过表示 ANSI 复杂内容退化截断
    return sliceByVisibleWidth(value, width);
  }
  if (visible === width) return value;
  return align === "right" ? padLeftVisible(value, width) : padRightVisible(value, width);
}

function padLeftVisible(text: string, width: number): string {
  const w = visibleWidth(text);
  if (w >= width) return text;
  return " ".repeat(width - w) + text;
}

function buildBorder(
  left: string,
  fill: string,
  right: string,
  innerWidth: number,
  title: string,
  open: string,
): string {
  if (!title) {
    return `${open}${left}${fill.repeat(innerWidth)}${right}${RESET}`;
  }
  const titleVis = visibleWidth(title);
  const titleSeg = ` ${title} `;
  const remain = innerWidth - titleVis - 2;
  const lpad = Math.max(2, Math.floor(remain / 2));
  const rpad = Math.max(2, remain - lpad);
  return `${open}${left}${fill.repeat(lpad)}${RESET}${titleSeg}${open}${fill.repeat(rpad)}${right}${RESET}`;
}

void isWide; // 用于将来的 cell-internal 截断辅助
