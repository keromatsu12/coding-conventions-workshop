// ⚠️ 【意図的に悪く書かれた教材コード】です。
// 第7章 7-7 例3 用。「注文」固有の知識が shared に置かれている。

import { TAX_RATE, FREE_SHIPPING_YEN, SHIPPING_FEE_YEN } from './constants';

export function calcTax(subtotal: number): number {
  return Math.floor(subtotal * TAX_RATE);
}

export function calcShipping(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_YEN ? 0 : SHIPPING_FEE_YEN;
}
