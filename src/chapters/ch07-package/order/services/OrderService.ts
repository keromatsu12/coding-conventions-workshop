// ⚠️ 【意図的に悪く書かれた教材コード】です。
// 第7章 7-7 例1 用。この階層に「窓口（index.ts）」が存在しないため、
// 外の機能から services/ や internal/ に直接手が伸びる。

import { Order } from '../Order';
import { priceOf } from '../internal/PriceTable';
import { MAX_ITEMS_PER_ORDER } from '../internal/constants';
import { User } from '../../user/User';

export class OrderService {
  place(user: User, lines: { productId: string; quantity: number }[]): Order {
    if (lines.length > MAX_ITEMS_PER_ORDER) {
      throw new Error('明細が多すぎます');
    }
    const items = lines.map((l) => ({
      productId: l.productId,
      price: priceOf(l.productId),
      quantity: l.quantity,
    }));
    return new Order('o-' + Date.now(), user, items);
  }
}
