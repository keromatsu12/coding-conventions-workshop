// ⚠️ このファイルは【意図的に悪く書かれた教材コード】です。実務で真似しないでください。
//    直し方は docs/coding-conventions.md を参照してください。

import { createConnection } from '../fake-libs/mysql';
import { sendMail } from '../fake-libs/mailer';
import { config } from './config';
import { g } from './globals';

export class Database {
  static async query(sql) {
    const conn = await createConnection(config);
    const rows = await conn.query(sql);
    await conn.end();
    return rows;
  }
}

export class Mailer {
  static async send(to, subject, body) {
    await sendMail(to, subject, body);
  }
}

// 月次レポートを送る
export async function sendMonthlyReport() {
  const id = 'report-' + Date.now() + '-' + Math.random().toString(36).slice(2);
  const start = Date.now();

  const users = await Database.query(`SELECT * FROM users`);
  const orders = await Database.query(`SELECT * FROM orders`);
  const items = await Database.query(`SELECT * FROM order_items`);

  const top = users.slice(0, 20);

  let body = '月次レポート ' + id + '\n';
  for (let i = 0; i < top.length; i++) {
    const f = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' });
    const re = new RegExp('^' + top[i].id + '$');
    let sum = 0;
    for (let j = 0; j < orders.length; j++) {
      if (re.test(orders[j].user_id)) {
        sum = sum + orders[j].total;
      }
    }
    let count = 0;
    for (let j = 0; j < orders.length; j++) {
      if (orders[j].user_id === top[i].id) {
        for (let k = 0; k < items.length; k++) {
          if (items[k].order_id === orders[j].id) count++;
        }
      }
    }
    body =
      body +
      top[i].name +
      ' (' +
      top[i].email +
      ' / ' +
      top[i].address +
      ') 合計 ' +
      f.format(sum) +
      ' 明細 ' +
      count +
      '件\n';
  }

  // 管理者に送る
  await Mailer.send('admin@example.com', '月次レポート', body);

  console.log('レポート送信 ' + (Date.now() - start) + 'ms');
  g.lastReportId = id;
  return body;
}

// 直近の注文をまとめて取る
export async function summarize(userId) {
  const user = await Database.query(`SELECT * FROM users WHERE id = '${userId}'`);
  const orders = await Database.query(`SELECT * FROM orders WHERE user_id = '${userId}'`);
  const products = await Database.query(`SELECT * FROM products`);
  return { user: user[0], orders: orders, products: products };
}
