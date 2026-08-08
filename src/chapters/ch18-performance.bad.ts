// ⚠️ 【意図的に悪く書かれた教材コード】です。実務で真似しないでください。
//
// 第18章 パフォーマンスの考え方 — 18-6「コード例で確認する（Before / After）」の Before だけ。
// 対応する解説：docs/coding-conventions.md 第18章（18-1 測ってから直す / 18-2 計算量 / 18-3 I/O）
//
// 注意：第18章の鉄則は「測ってから直す」です。
//       このファイルを読んで直したくなったら、まず計測方法を決めてください。

import {
  db,
  itemRepo,
  orderRepo,
  userRepo,
  fetchProfile,
  fetchOrders,
  fetchNotifications,
} from './_support';

// ------------------------------------------------------------
// 例1：O(n²)（18-6 例1）
// ------------------------------------------------------------

export function joinOrdersWithUsers(orders: any[], users: any[]) {
  return orders.map((order) => ({
    ...order,
    userName: users.find((u) => u.id === order.user_id)?.name,
  }));
}

// ------------------------------------------------------------
// 例2：N+1クエリ（18-6 例2）
// ------------------------------------------------------------

export async function loadOrdersWithItems() {
  const orders = await orderRepo.findAll();
  const result = [];
  for (const order of orders) {
    const items = await itemRepo.findByOrderId(order.id);
    result.push({ ...order, items });
  }
  return result;
}

// ------------------------------------------------------------
// 例3：直列 await（18-6 例3）
// ------------------------------------------------------------

export async function loadDashboard(userId: string) {
  const profile = await fetchProfile(userId);
  const orders = await fetchOrders(userId);
  const notifications = await fetchNotifications(userId);
  return { profile, orders, notifications };
}

// ------------------------------------------------------------
// 例4：全件・全列を取ってからアプリ側で絞る（18-6 例4）
// ------------------------------------------------------------

export async function firstPageOfUsers() {
  const users = await userRepo.findAll();
  return users.slice(0, 20);
}

export async function recentOrders() {
  const orders = await db.query(`SELECT * FROM orders`);
  return orders.sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, 10);
}

// ------------------------------------------------------------
// 例5：ループの中で毎回オブジェクトを生成する（18-6 例5）
// ------------------------------------------------------------

export function formatAmounts(orders: any[]) {
  const lines = [];
  for (const order of orders) {
    const formatter = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' });
    const idPattern = new RegExp('^o[0-9]+$');
    lines.push({
      id: order.id,
      valid: idPattern.test(order.id),
      amount: formatter.format(order.total),
    });
  }
  return lines;
}

// ------------------------------------------------------------
// 例6：根拠のない最適化（18-6 例6）
// ------------------------------------------------------------

export function indexById(rows: any[]) {
  return rows.reduce((acc, r) => ((acc[r.id] = r), acc), {});
}

// ------------------------------------------------------------
// おまけ：接続を毎回張り直す（第20章 20-0 の欠陥一覧より）
// ------------------------------------------------------------

export async function countOrdersPerUser(userIds: string[]) {
  const counts: Record<string, number> = {};
  for (const userId of userIds) {
    const orders = await db.query(`SELECT * FROM orders WHERE user_id = '${userId}'`);
    counts[userId] = orders.length;
  }
  return counts;
}
