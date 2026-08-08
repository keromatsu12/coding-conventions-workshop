// ⚠️ 【意図的に悪く書かれた教材コード】です。実務で真似しないでください。
//
// 第15章 セキュアコーディングの基礎 — 15-7「コード例で確認する（Before / After）」の Before だけ。
// 対応する解説：docs/coding-conventions.md 第15章
//
// 注意：このファイルは「脆弱性を書いてみせる」ためのものです。
//       実際に動く同種のコードは src/legacy-app/ にあり、npm start で
//       攻撃が成立するところまで観察できます。

import { app, db, logger, orderRepo, requireLogin, userRepo, Req, Res } from './_support';

// ------------------------------------------------------------
// 例1：SQLインジェクション（15-7 例1）
// ------------------------------------------------------------

export async function searchUsers(keyword: string, sortColumn: string) {
  const rows = await db.query(
    `SELECT * FROM users WHERE name LIKE '%${keyword}%' ORDER BY ${sortColumn}`,
  );
  return rows;
}

// ------------------------------------------------------------
// 例2：XSS（15-7 例2）
// ------------------------------------------------------------

export function renderGreeting(element: HTMLElement, userName: string) {
  element.innerHTML = `<div>ようこそ ${userName} さん</div>`;
}

export function renderGreetingHtml(userName: string): string {
  return `<html><body><div>ようこそ ${userName} さん</div></body></html>`;
}

// ------------------------------------------------------------
// 例3：認可漏れ（IDOR）（15-7 例3）
// ------------------------------------------------------------

app.get('/api/orders/:id', requireLogin, async (req: Req, res: Res) => {
  const order = await orderRepo.findById(req.params.id);
  res.status(200).json(order);
});

// ------------------------------------------------------------
// 例4：秘密情報の扱い（15-7 例4）
// ------------------------------------------------------------

export const API_KEY = 'sk_live_DUMMY_DO_NOT_USE_51H8xQ2000000';
export const DB_PASSWORD = 'p@ssw0rd';

export function logRequest(req: Req) {
  logger.info('APIリクエスト', { headers: req.headers });
}

export function logRegistration(user: any) {
  logger.info('登録', { user });
}

// ------------------------------------------------------------
// 例5：認証エラーで情報を漏らす（15-7 例5）
// ------------------------------------------------------------

export async function login(email: string, password: string, res: Res) {
  const user = await userRepo.findByEmail(email);
  if (!user) {
    return res.status(404).json({ message: 'このメールアドレスは未登録です' });
  }
  if (user.password !== password) {
    return res.status(401).json({ message: 'パスワードが違います' });
  }
  return res.status(200).json({ ok: true, user });
}

// ------------------------------------------------------------
// 例6：サーバー側で再検証していない（15-7 例6）
// ------------------------------------------------------------

app.post('/api/orders', async (req: Req, res: Res) => {
  await orderRepo.create(req.body);
  res.status(200).json({ ok: true });
});

// ------------------------------------------------------------
// おまけ：15-5「パスワードと認証」
// ------------------------------------------------------------

export function hashPassword(password: string): string {
  let s = '';
  for (let i = 0; i < password.length; i++) {
    s += String.fromCharCode(password.charCodeAt(i) + 1);
  }
  return Buffer.from(s).toString('base64');
}

export async function saveUser(name: string, email: string, password: string) {
  await db.query(
    `INSERT INTO users VALUES ('u9', '${name}', '${email}', '${password}', 0, 1, '', '2026-01-01')`,
  );
}
