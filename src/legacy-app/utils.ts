// ⚠️ このファイルは【意図的に悪く書かれた教材コード】です。実務で真似しないでください。
//    直し方は docs/coding-conventions.md を参照してください。

import { createConnection } from '../fake-libs/mysql';
import { config } from './config';

export class Utils {
  // 日付をフォーマットする
  static formatDate(d) {
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const dd = d.getDate();
    return y + '-' + (m < 10 ? '0' + m : m) + '-' + (dd < 10 ? '0' + dd : dd);
  }

  static calculateTax(n) {
    return Math.floor(n * 0.1);
  }

  static isValidEmail(s) {
    return s != null && s.indexOf('@') > 0;
  }

  static deepClone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  static yen(n) {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(n);
  }

  // 3日以上経過しているか
  static isOld(d) {
    const r = Date.now() - new Date(d).getTime() > 3 * 86400000;
    return r;
  }

  static uuid() {
    return 'x' + Math.random().toString(36).slice(2, 10) + Date.now();
  }

  static sleep(t) {
    return new Promise((resolve) => setTimeout(resolve, t));
  }

  static isEmpty(v) {
    if (v == null) return true;
    if (typeof v === 'string' && v === '') return true;
    if (Array.isArray(v) && v.length === 0) return true;
    return false;
  }
}

// ユーザーを取る
export async function fetchUser(id) {
  const conn = await createConnection(config);
  const rows = await conn.query(`SELECT * FROM users WHERE id = '${id}'`);
  await conn.end();
  return rows[0];
}

export async function getOrder(id) {
  const conn = await createConnection(config);
  const rows = await conn.query(`SELECT * FROM orders WHERE id = '${id}'`);
  await conn.end();
  return rows[0];
}

export async function retrieveProduct(id) {
  const conn = await createConnection(config);
  const rows = await conn.query(`SELECT * FROM products WHERE id = '${id}'`);
  await conn.end();
  return rows[0];
}

export async function loadOrderItems(orderId) {
  const conn = await createConnection(config);
  const rows = await conn.query(`SELECT * FROM order_items WHERE order_id = '${orderId}'`);
  await conn.end();
  return rows;
}

export async function fetchData(t) {
  const conn = await createConnection(config);
  const data = await conn.query(`SELECT * FROM ${t}`);
  await conn.end();
  return data;
}
