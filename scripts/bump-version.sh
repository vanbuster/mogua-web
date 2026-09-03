#!/usr/bin/env bash
# 把三个 HTML 里所有本地 css/js 的 ?v= 版本串刷成当前时间戳。
# 静态站没有构建步骤，改完前端资源必须跑这个，否则老访客拿到的是强缓存的旧文件。
set -euo pipefail
cd "$(dirname "$0")/.."
VER="${1:-$(date +%Y%m%d%H%M)}"
for f in index.html bazi.html qigua.html; do
  perl -pi -e "s/\?v=[0-9a-zA-Z.]+/?v=$VER/g" "$f"
done
echo "版本串已更新为 $VER"
grep -ho '?v=[0-9a-zA-Z.]*' index.html | sort -u
