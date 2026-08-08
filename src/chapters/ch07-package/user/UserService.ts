// ⚠️ 【意図的に悪く書かれた教材コード】です。
// 第7章 7-7 例1「窓口がない」用。
// 他機能（order）の内部にまっすぐ手を伸ばしている。

import { OrderService } from '../order/services/OrderService';
import { PRICE_TABLE } from '../order/internal/PriceTable';
import { CANCEL_LIMIT_HOURS } from '../order/internal/constants';
import { User } from './User';

export class UserService {
  private orderService = new OrderService();

  buy(user: User, productId: string, quantity: number) {
    const order = this.orderService.place(user, [{ productId, quantity }]);
    user.orders.push(order);
    return order;
  }

  estimate(productId: string, quantity: number): number {
    // 他機能の内部テーブルを直接読んでいる
    return PRICE_TABLE[productId] * quantity;
  }

  cancelLimitHours(): number {
    return CANCEL_LIMIT_HOURS;
  }
}
