// ⚠️ 【意図的に悪く書かれた教材コード】です。
// 第7章 7-7 例2「循環依存」用。user → order を参照している。
// order/Order.ts も user/User.ts を参照しているので、相互参照になっている。

import { Order } from '../order/Order';
import { displayName } from '../shared/userHelper';

export class User {
  public orders: Order[] = [];

  constructor(
    public id: string,
    public name: string,
    public membershipYears: number,
  ) {}

  label(): string {
    return displayName({ name: this.name, membershipYears: this.membershipYears });
  }

  totalSpent(): number {
    return this.orders.reduce((s, o) => s + o.total(), 0);
  }
}
