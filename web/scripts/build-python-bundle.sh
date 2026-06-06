#!/usr/bin/env bash
# 把父项目 src/haruhiloop_cli + src/assets + venv 里的 textual/rich/依赖
# 全部打包到 web/public/python/，供浏览器端 Pyodide 解包加载
# （实现真 1:1 Rich/Textual 渲染，含 Header/Footer/$accent border）。
set -euo pipefail

WEB_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PARENT_ROOT="$(cd "$WEB_DIR/.." && pwd)"
PARENT_SRC="$PARENT_ROOT/src"
SITE_PACKAGES="$PARENT_ROOT/.venv/lib/python3.12/site-packages"
OUT_DIR="$WEB_DIR/public/python"

mkdir -p "$OUT_DIR"

# 1. 父项目业务代码 + assets
(
  cd "$PARENT_SRC"
  rm -f "$OUT_DIR/haruhiloop_cli.zip"
  zip -r -q "$OUT_DIR/haruhiloop_cli.zip" haruhiloop_cli \
    -x "*.pyc" -x "__pycache__/*" -x "*/__pycache__/*" -x "**/__pycache__/*"
  rm -f "$OUT_DIR/assets.zip"
  zip -r -q "$OUT_DIR/assets.zip" assets
)

# 2. textual + rich + 它们的 pure-python 依赖。打成一个 zip 用 Pyodide
#    unpackArchive 解到 site-packages 下，避免运行时去 PyPI 拉。
DEPS=(
  rich
  textual
  pygments
  markdown_it
  mdurl
  linkify_it
  uc_micro
  platformdirs
  typing_extensions.py
)
(
  cd "$SITE_PACKAGES"
  rm -f "$OUT_DIR/pydeps.zip"
  zip -r -q "$OUT_DIR/pydeps.zip" "${DEPS[@]}" \
    -x "*.pyc" -x "__pycache__/*" -x "*/__pycache__/*" -x "**/__pycache__/*"
)

echo "[bundle] $(ls -lh "$OUT_DIR" | tail -n +2 | awk '{print $5, $9}')"
