// ⚠️ このファイルは【意図的に悪く書かれた教材コード】です。実務で真似しないでください。
//    直し方は docs/coding-conventions.md を参照してください。

import { createConnection } from '../fake-libs/mysql';
import { sendMail } from '../fake-libs/mailer';
import { config, ADMIN } from './config';
import { g } from './globals';
import { Utils } from './utils';

// 注文を処理する
export async function proc(d: any) {
  let t = 0;
  let id = null;
  if (d != null) {
    if (d.items != null && d.items.length > 0) {
      for (let i = 0; i < d.items.length; i++) {
        if (d.items[i].p != null) {
          if (d.items[i].q > 0) {
            t = t + d.items[i].p * d.items[i].q;
          }
        }
      }
      let tax = Math.floor(t * 0.1);
      t = t + tax;
      if (d.u.y >= 3) {
        t = t * 0.8;
      }
      if (d.c != null && d.c !== '') {
        t = t - 500;
      }
      if (t < 5000) {
        t = t + 600;
      }
      t = Math.floor(t);
      g.orderCount = g.orderCount + 1;
      g.total = g.total + t;
      id = 'o' + (100 + g.orderCount);
      g.lastOrderId = id;
      try {
        const conn = await createConnection(config);
        await conn.query(
          `INSERT INTO orders VALUES ('${id}', '${d.u.id}', ${t}, 'paid', '${Utils.formatDate(new Date())}')`,
        );
        await sendMail(
          d.u.email,
          'ご注文ありがとうございます:' + t,
          'ご注文ありがとうございます:' +
            t +
            '\n内部データ:' +
            JSON.stringify(d) +
            '\n担当:' +
            ADMIN,
        );
      } catch (e) {}
      return t;
    } else {
      return 0;
    }
  } else {
    return 0;
  }
}

// 割引率を返す
export function getDiscount(user) {
  if (user != null) {
    if (user.is_active) {
      if (user.membership_years >= 3) {
        if (user.total_purchase > 100000) {
          return 0.3;
        } else {
          return 0.2;
        }
      } else {
        if (user.membership_years >= 1) {
          return 0.1;
        } else {
          return 0;
        }
      }
    } else {
      return 0;
    }
  } else {
    return 0;
  }
}

// 価格を計算する
export function calcPrice(user, items, campaign) {
  let price = 0;
  for (let i = 0; i < items.length; i++) {
    price += items[i].p * items[i].q;
  }
  if (user.membership_years >= 3) price = price * 0.8;
  if (user.membership_years >= 1 && user.membership_years < 3) price = price * 0.9;
  if (campaign === 'summer') price = price * 0.95;
  if (campaign === 'newyear') price = price * 0.9;
  if (user.coupon) price = price - 500;
  if (price < 0) price = 0;
  return Math.floor(price);
}

// 通知する
export async function notify(user, type, disableNotification) {
  if (!disableNotification) {
    switch (type) {
      case 'email':
        await sendMail(user.email, 'お知らせ', 'お知らせです');
        break;
      case 'sms':
        console.log('sms送信: ' + user.phone);
        break;
      case 'push':
        console.log('push送信: ' + user.device_token);
        break;
      default:
        console.log('不明な通知種別');
    }
  }
}

// 注文を保存する
export async function saveOrder(o, isDraft) {
  const conn = await createConnection(config);
  if (isDraft) {
    await conn.query(
      `INSERT INTO orders VALUES ('${o.id}', '${o.user_id}', ${o.total}, 'draft', '${o.created_at}')`,
    );
  } else {
    await conn.query(
      `INSERT INTO orders VALUES ('${o.id}', '${o.user_id}', ${o.total}, 'paid', '${o.created_at}')`,
    );
    await sendMail(o.email, '注文確定', '注文が確定しました');
  }
  await conn.end();
}

export async function createOrder(
  userId,
  productId,
  quantity,
  couponCode,
  isGift,
  message,
  addressId,
) {
  const conn = await createConnection(config);
  const products = await conn.query(`SELECT * FROM products WHERE id = '${productId}'`);
  const p = products[0];
  let total = p.price * quantity;
  if (couponCode) total = total - 500;
  if (isGift) total = total + 300;
  const id = 'o' + (200 + g.orderCount);
  await conn.query(
    `INSERT INTO orders VALUES ('${id}', '${userId}', ${total}, 'paid', '${Utils.formatDate(new Date())}')`,
  );
  await conn.end();
  console.log('createOrder: ' + id + ' ' + message + ' ' + addressId);
  return id;
}

// 高額な注文を集める
export function collectHighValue(orders, result) {
  for (let i = 0; i < orders.length; i++) {
    if (orders[i].total > 10000) {
      result.push(orders[i]);
    }
  }
}

// 共通処理
export function process1(item, type) {
  if (type === 'order') {
    return { label: '注文', amount: item.total };
  } else if (type === 'product') {
    return { label: '商品', amount: item.price };
  } else if (type === 'user') {
    return { label: '会員', amount: item.membership_years };
  } else {
    return { label: '不明', amount: 0 };
  }
}

// 注文一覧を作る
export async function listOrdersWithUsers() {
  const conn = await createConnection(config);
  const orders = await conn.query(`SELECT * FROM orders`);
  const users = await conn.query(`SELECT * FROM users`);
  await conn.end();

  const list = [];
  for (let i = 0; i < orders.length; i++) {
    const u = users.find((x) => x.id === orders[i].user_id);
    const c = await createConnection(config);
    const items = await c.query(`SELECT * FROM order_items WHERE order_id = '${orders[i].id}'`);
    await c.end();
    const f = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' });
    list.push({
      id: orders[i].id,
      name: u ? u.name : '',
      email: u ? u.email : '',
      count: items.length,
      total: f.format(orders[i].total),
    });
  }
  return list;
}

// 注文を集計して表示する
export function checkAndReport(orders) {
  let sum = 0;
  const big = [];
  for (let i = 0; i < orders.length; i++) {
    sum = sum + orders[i].total;
    if (orders[i].total > 10000) {
      big.push(orders[i]);
    }
    console.log('注文: ' + orders[i].id + ' ' + orders[i].total);
  }
  console.log('合計: ' + sum);
  console.log('高額件数: ' + big.length);
  return sum;
}

// ダッシュボード用
export async function loadDashboard(userId) {
  const user = await fetchOne(`SELECT * FROM users WHERE id = '${userId}'`);
  const orders = await fetchOne(`SELECT * FROM orders WHERE user_id = '${userId}'`);
  const products = await fetchOne(`SELECT * FROM products`);
  return { user: user, orders: orders, products: products };
}

async function fetchOne(sql) {
  const conn = await createConnection(config);
  const rows = await conn.query(sql);
  await conn.end();
  return rows;
}
