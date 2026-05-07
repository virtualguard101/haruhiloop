// 与 Rich Table 默认 box.HEAVY_HEAD 风格对齐：
//   ┏━━━━━━━━━┳━━━━━━━━━┓     <- 顶（含标题，可选）
//   ┃ Header  ┃ Header  ┃     <- 表头（重边 + 重列分隔）
//   ┡━━━━━━━━━╇━━━━━━━━━┩     <- 表头下分隔（重转细）
//   │ data    │ data    │     <- 数据行（细边 + 细列分隔）
//   │ data    │ data    │
//   └─────────┴─────────┘     <- 底（细线）
// 这种"重头细身"的视觉与 Rich 输出完全一致；列宽自适应，
// 单元格超列宽时按可见宽度换行成多个物理行（保留外层 ANSI 包裹样式）。

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

export function renderTable(opts: TableOptions, totalWidth: number): string[] {
  const cols = opts.columns;
  if (cols.length === 0) return [];
  const colCount = cols.length;
  // 列分隔在表头是重列竖线 ┃（带左右 1 padding）= 3 cell
  // 在数据行是细列竖线 │（带左右 1 padding）= 3 cell
  // 两者占用宽度相同，按统一 sepTotal 计算。
  const sepTotal = 3 * (colCount - 1);
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
  const titleColor = opts.titleColor ?? border;
  const open = style({ fg: border });

  const lines: string[] = [];
  // 顶部：重线，含可选标题；列接驳点 ┳（在每一列结束位置之上）
  lines.push(buildTopBorder(widths, topFill, opts.title, titleColor, open));

  // 表头：重边 ┃ + 重列分隔 ┃
  const headerCells = cols.map((c, i) =>
    formatCell(wrap(c.header, { bold: true, fg: titleColor }), widths[i] ?? 0, c.align ?? "left"),
  );
  const headerSep = `${open}┃${RESET}`;
  lines.push(`${open}┃${RESET} ${headerCells.join(` ${headerSep} `)} ${open}┃${RESET}`);

  // 表头下分隔：重转细，列接驳点 ╇
  lines.push(buildHeaderUnderline(widths, open));

  // 数据行：细边 │ + 细列分隔 │
  const rowSep = `${open}│${RESET}`;
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
      let body = ` ${cells.join(` ${rowSep} `)} `;
      if (opts.highlightRow === idx) {
        // 高亮：整行 reverse + bold；外层边框颜色不变。
        // 注意 cells.join 已经写入了 RESET，会打断 reverse；
        // 重新构造：每个 cell 本体加 reverse，分隔符不加。
        const wrappedCellsHL = cols.map((c, i) => {
          const seg = wrappedCells[i]?.[li] ?? "";
          const formatted = formatCell(seg, widths[i] ?? 0, c.align ?? "left");
          return wrap(formatted, { reverse: true, bold: true });
        });
        body = ` ${wrappedCellsHL.join(` ${rowSep} `)} `;
      }
      lines.push(`${open}│${RESET}${body}${open}│${RESET}`);
    }
  });

  // 底部：细线
  lines.push(`${open}└${"─".repeat(topFill)}┘${RESET}`);
  return lines;
}

function formatCell(value: string, width: number, align: "left" | "right"): string {
  const visible = visibleWidth(value);
  if (visible > width) {
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

// 顶部：重线 ━，列接驳点 ┳。
// 标题居中嵌入顶边；过长则 fallback 到无标题（仍带列接驳点）。
function buildTopBorder(
  widths: number[],
  innerFill: number,
  title: string | undefined,
  titleColor: string,
  open: string,
): string {
  // 先生成不带标题的"列接驳重线"
  const segs: string[] = [];
  widths.forEach((w, i) => {
    // 每列对应可见 cell = padding(1) + width + padding(1) = w + 2
    segs.push("━".repeat(w + 2));
    if (i < widths.length - 1) segs.push("┳");
  });
  let plain = segs.join("");
  // 兜底（widths 总和 + sep != innerFill 时；理论上相等，安全起见对齐）
  if (visibleWidth(plain) < innerFill) {
    plain += "━".repeat(innerFill - visibleWidth(plain));
  } else if (visibleWidth(plain) > innerFill) {
    plain = "━".repeat(innerFill);
  }
  if (!title) {
    return `${open}┏${plain}┓${RESET}`;
  }
  const titleStyled = wrap(` ${title} `, { fg: titleColor, bold: true });
  const titleVis = visibleWidth(titleStyled);
  const remain = innerFill - titleVis;
  if (remain < 4) {
    return `${open}┏${plain}┓${RESET}`;
  }
  // 在顶边中央嵌入标题：把 plain 拆成左右两段，中间塞标题
  // 由于 plain 含 ┳ 接驳点，简单按可见宽度切，可能切到接驳点上 ——
  // 视觉上 ┳ 被替换成 ━标题字符可接受，标题居中观感更接近 Rich。
  const leftFill = 2;
  const rightFill = remain - leftFill;
  return (
    `${open}┏${"━".repeat(leftFill)}${RESET}` +
    `${titleStyled}` +
    `${open}${"━".repeat(rightFill)}┓${RESET}`
  );
}

// 表头下分隔：重→细的过渡线，列接驳点 ╇。
function buildHeaderUnderline(widths: number[], open: string): string {
  const segs: string[] = [];
  widths.forEach((w, i) => {
    segs.push("━".repeat(w + 2));
    if (i < widths.length - 1) segs.push("╇");
  });
  return `${open}┡${segs.join("")}┩${RESET}`;
}

void isWide;
