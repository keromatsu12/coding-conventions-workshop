// ⚠️ 【意図的に悪く書かれた教材コード】です。実務で真似しないでください。
//
// 第10章 エラーハンドリングと例外設計 — 10-8「コード例で確認する（Before / After）」の Before だけ。
// 対応する解説：docs/coding-conventions.md 第10章

import { cache, mailer, paymentApi, userRepo, Req, Res } from './_support';

// ------------------------------------------------------------
// 例1：想定内の業務エラーを例外で表現する（10-8 例1）
// ------------------------------------------------------------

export function reserveStock(item: { id: string; stock: number }, quantity: number): void {
  if (item.stock < quantity) {
    throw new Error('在庫不足');
  }
  item.stock -= quantity;
}

// ------------------------------------------------------------
// 例2：例外の情報を捨てる（10-8 例2）
// ------------------------------------------------------------

export async function pay(order) {
  try {
    return await paymentApi.charge(order);
  } catch (e) {
    // 元の例外（原因もスタックトレースも）が消える
    throw new Error('決済に失敗しました');
  }
}

// ------------------------------------------------------------
// 例3：握りつぶし（10-8 例3）
// ------------------------------------------------------------

export async function invalidate(key: string) {
  try {
    await cache.delete(key);
  } catch (e) {}
}

// ------------------------------------------------------------
// 例4：層をまたいで実装詳細が漏れる（10-8 例4）
// ------------------------------------------------------------

export async function registerUser(req: Req, res: Res) {
  try {
    await userRepo.save(req.body);
    res.status(200).json({ ok: true });
  } catch (e: any) {
    if (e.code === 'ER_DUP_ENTRY') {
      res.status(500).json({ message: e.sqlMessage, sql: e.sql });
      return;
    }
    res.status(500).json({ message: e.message, stack: e.stack });
  }
}

// ------------------------------------------------------------
// 例5：検証が散らばっていて、しかも黙って返る（10-8 例5）
// ------------------------------------------------------------

export async function sendCampaignMail(email: string) {
  if (!email.includes('@')) {
    return;
  }
  await mailer.send(email, 'キャンペーン', 'キャンペーンのご案内です');
}

export async function subscribe(email: string) {
  if (!email.includes('@')) {
    return;
  }
  await userRepo.save({ email, subscribed: true });
  await sendCampaignMail(email);
}

export async function updateEmail(userId: string, email: string) {
  if (!email.includes('@')) {
    return;
  }
  const user = await userRepo.findById(userId);
  user.email = email;
  await userRepo.save(user);
}

// ------------------------------------------------------------
// 例6：素朴なリトライ（10-8 例6）
// ------------------------------------------------------------

export async function chargeWithRetry(order) {
  for (let i = 0; i < 3; i++) {
    try {
      return await paymentApi.charge(order);
    } catch (e) {}
  }
  return null;
}

// ------------------------------------------------------------
// おまけ：握りつぶしの3兄弟（10-3、L3228-3246）
// ------------------------------------------------------------

export async function swallow1() {
  try {
    await cache.delete('k');
  } catch {
    /* 何もしない */
  }
}

export async function swallow2() {
  try {
    await cache.delete('k');
  } catch (e) {
    console.log(e);
  }
}

export async function swallow3() {
  try {
    await userRepo.save({});
  } catch (e) {
    throw new Error('保存に失敗');
  }
}
