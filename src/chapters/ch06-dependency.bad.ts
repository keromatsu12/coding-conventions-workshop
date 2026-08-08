// ⚠️ 【意図的に悪く書かれた教材コード】です。実務で真似しないでください。
//
// 第6章 依存関係の考え方 — 6-4「コード例で確認する（Before / After）」の Before だけ。
// 対応する解説：docs/coding-conventions.md 第6章（6-2 依存の向き / 6-3 DI）

import { randomUUID } from 'node:crypto';
import { Database, Mailer } from './_support';
import { MySQLClient } from './ch06-infrastructure/MySQLClient';

// ------------------------------------------------------------
// 例1：時刻・乱数を直接呼んでいる（6-4 例1）
// ------------------------------------------------------------

export function createSession(userId) {
  return {
    id: randomUUID(),
    userId,
    createdAt: Date.now(),
    expiresAt: Date.now() + 3600_000,
  };
}

export function isExpired(session) {
  return session.expiresAt < Date.now();
}

// ------------------------------------------------------------
// 例2：静的メソッドを直接呼んでいる（6-4 例2）
// ------------------------------------------------------------

export async function sendMonthlyReport() {
  const rows = await Database.query(`SELECT * FROM orders`);
  let total = 0;
  for (const row of rows) {
    total += row.total;
  }
  await Mailer.send('admin@example.com', '月次レポート', `今月の売上: ${total}円`);
  return total;
}

// ------------------------------------------------------------
// 例3：依存の向きが逆（ドメインがインフラを知っている）（6-4 例3）
// ------------------------------------------------------------

export class Order {
  constructor(
    public id: string,
    public userId: string,
    public items: any[],
  ) {}

  calculateTotal() {
    return this.items.reduce((s, i) => s + i.price * i.quantity, 0);
  }

  // 業務ルールを持つクラスが、自分で自分を保存している
  async save() {
    await new MySQLClient().insert('orders', this);
  }
}

// ------------------------------------------------------------
// 例4：設定値を深いところで直接読む（6-4 例4）
// ------------------------------------------------------------

export async function callExternalApi(path) {
  const url = process.env.API_URL + path;
  const key = process.env.API_KEY;
  console.log(`GET ${url} (key=${key})`);
  return { url, key };
}
