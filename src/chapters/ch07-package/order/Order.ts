// ⚠️ 【意図的に悪く書かれた教材コード】です。
// 第7章 7-7 例2「循環依存」用。order → user を参照している。

import { User } from '../user/User';
import { calcTax, calcShipping } from '../../ch07-package/shared/orderHelper';
import { TAX_RATE } from './internal/constants';

export class Order {
  constructor(
    public id: string,
    public user: User,
    public items: { productId: string; price: number; quantity: number }[],
  ) {}

  subtotal(): number {
    return this.items.reduce((s, i) => s + i.price * i.quantity, 0);
  }

  total(): number {
    const sub = this.subtotal();
    void TAX_RATE;
    return sub + calcTax(sub) + calcShipping(sub);
  }

  ownerLabel(): string {
    return this.user.label();
  }
}
