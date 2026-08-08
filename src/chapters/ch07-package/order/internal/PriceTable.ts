// ⚠️ 【意図的に悪く書かれた教材コード】です。
// 第7章 7-7 例1 用。internal/ という名前なのに、外の機能から直接 import されている。

export const PRICE_TABLE: Record<string, number> = {
  p1: 8000,
  p2: 3000,
  p3: 25000,
};

export function priceOf(productId: string): number {
  return PRICE_TABLE[productId] ?? 0;
}
