// ⚠️ 【意図的に悪く書かれた教材コード】です。実務で真似しないでください。
//
// 第2章 命名とコメント — 2-6「コード例で確認する（Before / After）」の Before だけを
// TypeScript にしたものです。After は載せていません。自分で書いてみてください。
//
// 対応する解説：docs/coding-conventions.md 第2章（2-2 良い名前の6条件 / 2-3 アンチパターン）

import { db, userRepo, orderRepo, productRepo } from './_support';

// ------------------------------------------------------------
// 例1：単位・型が名前から分からない（2-6 例1）
// ------------------------------------------------------------

export function retryAfter(t) {
  setTimeout(() => {
    doRetry();
  }, t);
}

retryAfter(30);

function doRetry() {}

// ------------------------------------------------------------
// 例2：boolean が二重否定になっている（2-6 例2）
// ------------------------------------------------------------

export function send(user, disableNotification) {
  if (!disableNotification) {
    doSend(user);
  }
}

function doSend(user) {
  void user;
}

// ------------------------------------------------------------
// 例3：関数名が動作を偽っている（2-6 例3）
// ------------------------------------------------------------

export async function getUser(id) {
  const user = await userRepo.findById(id);
  user.lastAccessedAt = new Date();
  await db.save(user);
  return user;
}

// ------------------------------------------------------------
// 例4：data / info / flag（2-6 例4）
// ------------------------------------------------------------

export async function fetchData(id) {
  const data = await orderRepo.findById(id);
  const info = data;
  const d = info;
  const flag = d.status === 'paid';
  return { data: d, flag: flag };
}

// ------------------------------------------------------------
// 例5：マジックナンバー（2-6 例5）
// ------------------------------------------------------------

export function calc(user, total) {
  if (user.membership_years > 20) {
    return total * 0.15;
  }
  if (total > 5000) {
    return total * 0.15;
  }
  return 0;
}

// ------------------------------------------------------------
// 例6：コメントで補うより名前をつける（2-6 例6）
// ------------------------------------------------------------

export function check(order) {
  // 発送から3日以上経過しているかどうかを判定する
  const r = Date.now() - new Date(order.created_at).getTime() > 3 * 86400000;
  return r;
}

// ------------------------------------------------------------
// 例7：一貫性のない語彙（2-6 例7）
// ------------------------------------------------------------

export async function fetchUser(id) {
  return userRepo.findById(id);
}

export async function getOrder(id) {
  return orderRepo.findById(id);
}

export async function retrieveProduct(id) {
  return productRepo.findById(id);
}

export async function loadInvoice(id) {
  return db.query(`SELECT * FROM orders WHERE id = '${id}'`);
}

// ------------------------------------------------------------
// おまけ：2-3「よくある命名のアンチパターン」の表から（L686-698）
// ------------------------------------------------------------

export class OrderManager {
  // 注文を処理する
  async processChumon(d, n, s) {
    const temp = d;
    const result = n;
    const list1 = [];
    const list2 = [];
    void s;
    void temp;
    void result;
    void list1;
    void list2;
  }
}

export function getUserData(id) {
  return userRepo.findById(id);
}
