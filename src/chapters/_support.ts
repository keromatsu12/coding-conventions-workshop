/**
 * ============================================================
 *  ⚠️ このファイルは【リファクタリング対象外】です。
 * ============================================================
 *
 * 章別スニペット（ch02〜ch18）が参照する共同作業者（DB・メール・ログ等）の
 * ダミー実装です。スニペットを「型が通る状態」で読めるようにするためだけに
 * 置いてあります。演習で直すのは ch*.bad.ts の側です。
 */

import { createConnection, Row } from '../fake-libs/mysql';
import { sendMail } from '../fake-libs/mailer';

const CONFIG = { host: 'localhost', user: 'root', password: 'root', database: 'shop' };

export const db = {
  async query(sql: string, params?: any[]): Promise<any> {
    const conn = await createConnection(CONFIG);
    const rows = await conn.query(sql, params);
    await conn.end();
    return rows;
  },
  async save(entity: any): Promise<void> {
    void entity;
  },
};

export class Database {
  static async query(sql: string, params?: any[]): Promise<any> {
    return db.query(sql, params);
  }
}

export class Mailer {
  static async send(to: string, subject: string, body: string): Promise<void> {
    await sendMail(to, subject, body);
  }
}

export const mailer = {
  async send(to: string, subject: string, body: string): Promise<void> {
    await sendMail(to, subject, body);
  },
};

export const logger = {
  info(message: string, meta?: any): void {
    void message;
    void meta;
  },
  warn(message: string, meta?: any): void {
    void message;
    void meta;
  },
  error(message: string, meta?: any): void {
    void message;
    void meta;
  },
};

export const cache = {
  store: new Map<string, any>(),
  async get(key: string): Promise<any> {
    return this.store.get(key);
  },
  async set(key: string, value: any): Promise<void> {
    this.store.set(key, value);
  },
  async delete(key: string): Promise<void> {
    if (!this.store.has(key)) throw new Error(`キャッシュに ${key} がありません`);
    this.store.delete(key);
  },
};

export const notifier = {
  async send(user: any, options?: any): Promise<void> {
    void user;
    void options;
  },
};

export const paymentApi = {
  async charge(order: any): Promise<{ paymentId: string }> {
    if (order?.total > 20000) throw new Error('payment gateway timeout');
    return { paymentId: 'pay-1' };
  },
};

export const userRepo = {
  async findById(id: string): Promise<Row> {
    const rows = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0];
  },
  async findByEmail(email: string): Promise<Row> {
    const rows = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0];
  },
  async findAll(): Promise<Row[]> {
    return db.query('SELECT * FROM users');
  },
  async save(user: any): Promise<void> {
    void user;
  },
};

export const orderRepo = {
  async findById(id: string): Promise<Row> {
    const rows = await db.query('SELECT * FROM orders WHERE id = ?', [id]);
    return rows[0];
  },
  async findByUserId(userId: string): Promise<Row[]> {
    return db.query('SELECT * FROM orders WHERE user_id = ?', [userId]);
  },
  async findAll(): Promise<Row[]> {
    return db.query('SELECT * FROM orders');
  },
  async create(order: any): Promise<void> {
    void order;
  },
};

export const itemRepo = {
  async findByOrderId(orderId: string): Promise<Row[]> {
    return db.query('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
  },
};

export const productRepo = {
  async findById(id: string): Promise<Row> {
    const rows = await db.query('SELECT * FROM products WHERE id = ?', [id]);
    return rows[0];
  },
};

export async function fetchProfile(userId: string): Promise<any> {
  await delay(300);
  return { userId, nickname: 'taro' };
}

export async function fetchOrders(userId: string): Promise<any[]> {
  await delay(300);
  return orderRepo.findByUserId(userId);
}

export async function fetchNotifications(userId: string): Promise<any[]> {
  await delay(300);
  return [{ userId, message: 'お知らせ' }];
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Express 風の req/res（第10章・第15章のスニペット用）。 */
export interface Req {
  params: Record<string, string>;
  query: Record<string, any>;
  body: any;
  headers: Record<string, any>;
  method: string;
  path: string;
  user?: any;
}

export interface Res {
  status(code: number): Res;
  json(payload: any): Res;
  end(): Res;
}

export const app = {
  get(path: string, ...handlers: any[]): void {
    void path;
    void handlers;
  },
  post(path: string, ...handlers: any[]): void {
    void path;
    void handlers;
  },
};

export function requireLogin(req: Req, res: Res, next: () => void): void {
  void req;
  void res;
  next();
}
