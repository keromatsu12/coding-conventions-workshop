// ⚠️ 【意図的に悪く書かれた教材コード】です。実務で真似しないでください。
//
// 第5章 SOLID原則 — 5-7「コード例で確認する（Before / After）」の Before だけ。
// 対応する解説：docs/coding-conventions.md 第5章

import { db, mailer } from './_support';

// ------------------------------------------------------------
// 例1：SRP違反（1クラスに変更理由が3つ）（5-7 例1）
// ------------------------------------------------------------

export class Invoice {
  constructor(public items: any[]) {}

  calculateTotal() {
    return this.items.reduce((s, i) => s + i.price * i.quantity, 0);
  }

  toPdf() {
    return `%PDF-1.4\n請求金額: ${this.calculateTotal()}\n`;
  }

  async save() {
    await db.save({ type: 'invoice', total: this.calculateTotal() });
  }
}

// ------------------------------------------------------------
// 例2：OCP違反（種別が増えるたびに switch を編集する）（5-7 例2）
// ------------------------------------------------------------

export async function notify(type, user, message) {
  switch (type) {
    case 'email':
      await mailer.send(user.email, 'お知らせ', message);
      break;
    case 'sms':
      console.log(`SMS: ${user.phone} ${message}`);
      break;
    case 'push':
      console.log(`PUSH: ${user.deviceToken} ${message}`);
      break;
    default:
      throw new Error('未知の通知種別: ' + type);
  }
}

// ------------------------------------------------------------
// 例3：LSP違反（継承で不変条件が壊れる）（5-7 例3）
// ------------------------------------------------------------

export class Stack extends Array {
  push(...items: any[]) {
    return super.push(...items);
  }

  pop() {
    return super.pop();
  }
}

export function breakStack() {
  const s = new Stack();
  s.push('a');
  s.push('b');
  s[0] = 'x'; // Stack のはずなのに添字で書き換えられる
  s.splice(0, 1); // 途中から抜ける
  s.length = 0; // 一気に空になる
  return s;
}

// ------------------------------------------------------------
// 例4：ISP違反（太いインターフェース）（5-7 例4）
// ------------------------------------------------------------

export interface Storage {
  read(key: string): Promise<string>;
  write(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  listAll(): Promise<string[]>;
}

export class ReadOnlyConfig implements Storage {
  private values = new Map<string, string>();

  async read(key: string): Promise<string> {
    return this.values.get(key) ?? '';
  }

  async write(key: string, value: string): Promise<void> {
    void key;
    void value;
    throw new Error('読み取り専用です');
  }

  async delete(key: string): Promise<void> {
    void key;
    throw new Error('読み取り専用です');
  }

  async listAll(): Promise<string[]> {
    return [...this.values.keys()];
  }
}

// ------------------------------------------------------------
// 例5：DIP違反（具体実装を内部で生成する）（5-7 例5）
// ------------------------------------------------------------

class SlackClient {
  constructor(private token: string) {}
  async post(channel: string, text: string) {
    void this.token;
    console.log(`slack ${channel}: ${text}`);
  }
}

export class AlertService {
  async alert(message: string) {
    const client = new SlackClient(process.env.SLACK_TOKEN);
    await client.post('#alerts', message);
  }
}

// ------------------------------------------------------------
// 例6：全部入り（5-7 例6）
// ------------------------------------------------------------

export function calculatePrice(user, items, campaign) {
  let price = 0;
  for (const item of items) {
    price += item.price * item.quantity;
  }
  if (user.membershipYears >= 1) price = price * 0.9;
  if (user.membershipYears >= 3) price = price * 0.8;
  if (campaign === 'summer') price = price * 0.95;
  if (user.hasCoupon) price = price - 500;
  if (price < 0) price = 0;
  return price;
}

// ------------------------------------------------------------
// おまけ1：SRP（5-1、L1581-1594）
// ------------------------------------------------------------

export class Employee {
  constructor(public hours: number, public rate: number) {}

  calculatePay() {
    return this.hours * this.rate;
  }

  reportHours() {
    return `${this.hours}時間`;
  }

  async save() {
    await db.save({ type: 'employee', hours: this.hours });
  }
}

// ------------------------------------------------------------
// おまけ2：OCP（5-2、L1617-1634）
// ------------------------------------------------------------

export function processPayment(type, amount) {
  if (type === 'credit') {
    return amount * 1.03;
  } else if (type === 'bank') {
    return amount + 440;
  } else if (type === 'convenience') {
    return amount + 200;
  } else {
    throw new Error('未知の支払い方法');
  }
}

// ------------------------------------------------------------
// おまけ3：DIP（5-5、L1751-1780）
// ------------------------------------------------------------

class MySQLDatabase {
  async insert(table: string, row: any) {
    void table;
    void row;
  }
}

export class OrderService {
  private db2: MySQLDatabase;

  constructor() {
    // ここで実装を名指ししているので、テストで差し替えられない
    this.db2 = new MySQLDatabase();
  }

  async place(order) {
    await this.db2.insert('orders', order);
  }
}
