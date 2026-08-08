// ⚠️ このファイルは【意図的に悪く書かれた教材コード】です。実務で真似しないでください。
//    直し方は docs/coding-conventions.md を参照してください。

import { createConnection } from '../fake-libs/mysql';
import { config } from './config';
import { g } from './globals';

// 在庫を引き当てる
export async function reserve(productId, q) {
  const conn = await createConnection(config);
  const rows = await conn.query(`SELECT * FROM products WHERE id = '${productId}'`);
  const item = rows[0];
  if (item.stock < q) {
    throw new Error('在庫不足');
  }
  await conn.query(`UPDATE products SET stock = ${item.stock - q} WHERE id = '${productId}'`);
  await conn.end();
  return true;
}

// 決済する
export async function charge(order) {
  // 3回まで試す
  for (let i = 0; i < 3; i++) {
    try {
      return await callPaymentApi(order);
    } catch (e) {}
  }
  return null;
}

async function callPaymentApi(order) {
  await new Promise((r) => setImmediate(r));
  g.paymentCallCount = (g.paymentCallCount || 0) + 1;
  if (order.total > 20000) {
    // 高額決済は外部審査でよく失敗する
    throw new Error('payment gateway timeout');
  }
  return { paymentId: 'pay-' + g.paymentCallCount, amount: order.total };
}

// 支払いを確定する
export async function settle(order) {
  try {
    await charge(order);
  } catch (e) {
    throw new Error('決済に失敗しました');
  }
}

// キャッシュを消す
export async function invalidate(key) {
  try {
    await removeCache(key);
  } catch (e) {}
}

async function removeCache(key) {
  if (g.settingsCache == null) {
    throw new Error('キャッシュが初期化されていません: ' + key);
  }
  delete g.settingsCache[key];
}

// 在庫を確認して確保する
export async function reserveAll(items) {
  const done = [];
  for (let i = 0; i < items.length; i++) {
    try {
      await reserve(items[i].id, items[i].q);
      done.push(items[i].id);
    } catch (e) {
      console.log(e);
    }
  }
  return done;
}
