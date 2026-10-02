#!/usr/bin/env node
// npm start の出力を「特性テスト」として固定し、リファクタリング後に比較する（第17章 17-1 / 第20章 20-4）。
//
//   node .claude/skills/safe-refactor/scripts/golden-master.mjs record   # 今の振る舞いを記録
//   node .claude/skills/safe-refactor/scripts/golden-master.mjs verify   # 記録と比較（差分があれば exit 1）
//
// 実行ごとに変わる値（レポートID・処理時間）は比較前に正規化する。
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ROOT = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
const BASELINE_PATH = join(ROOT, '.golden-master', 'baseline.txt');
const LATEST_PATH = join(ROOT, '.golden-master', 'latest.txt');

const NONDETERMINISTIC_PATTERNS = [
  [/report-\d+-[a-z0-9]+/g, 'report-<ID>'],
  [/\b\d+ms\b/g, '<N>ms'],
];

function captureOutput() {
  // tsc の型エラーも「振る舞いの変化」として拾いたいので、失敗しても出力は捕まえる
  try {
    return execSync('npm start --silent', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    return `${error.stdout ?? ''}${error.stderr ?? ''}\n[exit code ${error.status}]\n`;
  }
}

function normalize(output) {
  return NONDETERMINISTIC_PATTERNS.reduce((text, [pattern, placeholder]) => text.replace(pattern, placeholder), output);
}

function writeText(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

function record() {
  writeText(BASELINE_PATH, normalize(captureOutput()));
  console.log(`記録しました: ${BASELINE_PATH}`);
}

function verify() {
  if (!existsSync(BASELINE_PATH)) {
    console.error('ベースラインがありません。先に record を実行してください。');
    process.exit(2);
  }
  const expected = readFileSync(BASELINE_PATH, 'utf8');
  const actual = normalize(captureOutput());
  writeText(LATEST_PATH, actual);
  if (actual === expected) {
    console.log('OK: 振る舞いは変わっていません。');
    return;
  }
  console.error('NG: 出力が変わりました。リファクタリングなら、それはバグです。');
  try {
    execSync(`diff -u "${BASELINE_PATH}" "${LATEST_PATH}"`, { stdio: 'inherit' });
  } catch {
    // diff は差分があると exit 1 を返す。表示できれば十分
  }
  process.exit(1);
}

const command = process.argv[2];
if (command === 'record') record();
else if (command === 'verify') verify();
else {
  console.error('使い方: golden-master.mjs <record|verify>');
  process.exit(2);
}
