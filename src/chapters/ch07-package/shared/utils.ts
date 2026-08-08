// ⚠️ 【意図的に悪く書かれた教材コード】です。
// 第7章 7-7 例3「shared が肥大化する」用。

export function formatDate(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function deepClone<T>(o: T): T {
  return JSON.parse(JSON.stringify(o));
}

export function isEmpty(v: any): boolean {
  return v == null || v === '' || (Array.isArray(v) && v.length === 0);
}

export function yen(n: number): string {
  return `${n.toLocaleString('ja-JP')}円`;
}
