#!/usr/bin/env bash
# 差分の大きさと「混ぜてはいけない変更」の兆候を報告する（第13章 13-1 / 13-3）。
#
#   diff-report.sh            # ステージ済みの変更（git diff --cached）
#   diff-report.sh main       # main からの差分（PR全体）
set -euo pipefail

BASE="${1:-}"
if [[ -n "$BASE" ]]; then
  RANGE=("$BASE...HEAD")
  LABEL="$BASE...HEAD"
else
  RANGE=(--cached)
  LABEL="staged"
fi

PR_LINE_LIMIT=400

total_lines=$(git diff --numstat "${RANGE[@]}" | awk '{ s += $1 + $2 } END { print s + 0 }')
non_whitespace_lines=$(git diff -w --ignore-blank-lines --numstat "${RANGE[@]}" | awk '{ s += $1 + $2 } END { print s + 0 }')
whitespace_only_lines=$((total_lines - non_whitespace_lines))

echo "== 差分レポート ($LABEL) =="
echo
git diff --stat "${RANGE[@]}" | tail -n 25
echo
echo "変更行数（追加+削除）: $total_lines"
echo "  うち空白・改行だけの変更: $whitespace_only_lines"

if (( total_lines == 0 )); then
  echo
  echo "差分がありません。"
  exit 0
fi

echo
if (( total_lines > PR_LINE_LIMIT )); then
  echo "[WARN] ${PR_LINE_LIMIT}行を超えています。レビューが実質機能しなくなる大きさです（13-3）。分割を検討してください。"
fi
if (( whitespace_only_lines > 0 && non_whitespace_lines > 0 )); then
  echo "[WARN] 整形（空白のみ）の変更と中身の変更が混ざっています。整形は単独コミットにします（13-1）。"
fi

touched_tests=$(git diff --name-only "${RANGE[@]}" | grep -cE '\.test\.|\.spec\.|__tests__/' || true)
touched_src=$(git diff --name-only "${RANGE[@]}" | grep -E '\.(ts|js|tsx|jsx)$' | grep -cvE '\.test\.|\.spec\.|__tests__/' || true)
echo "変更ファイル: 実装 ${touched_src} / テスト ${touched_tests}"
if (( touched_src > 0 && touched_tests == 0 )); then
  echo "[INFO] 実装だけが変わっています。この変更を保証するテストはありますか（19-4）。"
fi

protected=$(git diff --name-only "${RANGE[@]}" | grep -E '^src/fake-libs/|^src/chapters/_support\.ts$|^src/chapters/ch11-subject\.ts$' || true)
if [[ -n "$protected" ]]; then
  echo "[WARN] 触らない前提の教材ファイルが変更されています:"
  echo "$protected" | sed 's/^/  - /'
fi
