// Pyodide 渲染桥：浏览器端加载 Pyodide → 解包 textual + rich + 依赖 +
// haruhiloop_cli + assets + driver → 启动完整 Textual app（含 Header/Footer/
// Screen $accent 黄边框）→ 之后所有按键 / tick / resize 都通过 driver 驱动
// Textual Pilot 模式，每帧整屏 ANSI 写入 xterm.js。
//
// 这是真正的 1:1 还原 —— 渲染就是父项目的 HaruhiPlayApp 在 Pyodide 里运行。

import { loadPyodide, type PyodideInterface } from "pyodide";

export type ProgressCallback = (stage: string, detail?: string) => void;

let pyodideInstance: PyodideInterface | null = null;
let bootPromise: Promise<PyodideInterface> | null = null;

const PYODIDE_INDEX_URL =
  (import.meta.env?.VITE_PYODIDE_INDEX_URL as string | undefined) ??
  "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/";

const PY_BUNDLES = {
  haruhiloop: "./python/haruhiloop_cli.zip",
  assets: "./python/assets.zip",
  pydeps: "./python/pydeps.zip",
  driver: "./python/driver.py",
  panels: "./python/web_panels.py",
} as const;

async function fetchU8(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} → HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} → HTTP ${res.status}`);
  return res.text();
}

export async function bootPyodide(
  initialCols: number,
  initialRows: number,
  progress?: ProgressCallback,
): Promise<PyodideInterface> {
  if (pyodideInstance) return pyodideInstance;
  if (bootPromise) return bootPromise;
  bootPromise = (async () => {
    progress?.("加载 Python 运行时", "pyodide.asm.wasm");
    const py = await loadPyodide({ indexURL: PYODIDE_INDEX_URL });

    progress?.("解包 Rich / Textual / 依赖", "pydeps.zip 2.3 MB");
    const pydeps = await fetchU8(PY_BUNDLES.pydeps);
    // site-packages 路径在 Pyodide 0.27 是 /lib/python3.12/site-packages
    py.unpackArchive(pydeps, "zip", {
      extractDir: "/lib/python3.12/site-packages",
    });

    progress?.("解包游戏代码", "haruhiloop_cli + assets");
    const [pkgZip, assetZip] = await Promise.all([
      fetchU8(PY_BUNDLES.haruhiloop),
      fetchU8(PY_BUNDLES.assets),
    ]);
    py.unpackArchive(pkgZip, "zip", { extractDir: "/home/pyodide" });
    py.unpackArchive(assetZip, "zip", { extractDir: "/home/pyodide" });

    progress?.("加载渲染驱动", "driver.py");
    const [driverSrc, panelsSrc] = await Promise.all([
      fetchText(PY_BUNDLES.driver),
      fetchText(PY_BUNDLES.panels),
    ]);
    py.FS.writeFile("/home/pyodide/web_panels.py", panelsSrc);
    py.FS.writeFile("/home/pyodide/driver.py", driverSrc);
    py.runPython(`
import sys
for p in ('/home/pyodide',):
    if p not in sys.path:
        sys.path.insert(0, p)
import driver
`);
    progress?.(`启动 Textual app（${initialCols}×${initialRows}）`, "Pilot 模式");
    await py.runPythonAsync(
      `await driver.boot_textual_app(${initialCols}, ${initialRows})`,
    );
    progress?.("就绪", "");
    pyodideInstance = py;
    return py;
  })();
  return bootPromise;
}

export function pyodideReady(): boolean {
  return pyodideInstance !== null;
}

export async function sendKey(key: string): Promise<void> {
  if (!pyodideInstance) return;
  // 用 globals.set 把 key 安全地传进 python，避免 escape
  pyodideInstance.globals.set("__key__", key);
  await pyodideInstance.runPythonAsync(`await driver.send_key(__key__)`);
}

export async function tick(seconds = 0.05): Promise<void> {
  if (!pyodideInstance) return;
  await pyodideInstance.runPythonAsync(`await driver.tick(${seconds})`);
}

export async function renderFrame(cols: number, rows: number): Promise<string> {
  if (!pyodideInstance) return "";
  const result = await pyodideInstance.runPythonAsync(
    `await driver.render_frame(${cols}, ${rows})`,
  );
  return typeof result === "string" ? result : String(result);
}

export async function resize(cols: number, rows: number): Promise<void> {
  if (!pyodideInstance) return;
  await pyodideInstance.runPythonAsync(`await driver.resize(${cols}, ${rows})`);
}

export async function scroll(
  direction: "up" | "down" | "home" | "end",
  amount = 3,
): Promise<void> {
  if (!pyodideInstance) return;
  pyodideInstance.globals.set("__scroll_dir__", direction);
  pyodideInstance.globals.set("__scroll_amt__", amount);
  await pyodideInstance.runPythonAsync(
    `await driver.scroll(__scroll_dir__, __scroll_amt__)`,
  );
}
