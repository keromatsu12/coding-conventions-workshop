// ⚠️ 【意図的に悪く書かれた教材コード】です。実務で真似しないでください。
//
// 第4章 凝集度と結合度 — 4-4「コード例で確認する（Before / After）」の Before だけ。
// 対応する解説：docs/coding-conventions.md 第4章

import { notifier, userRepo } from './_support';

// ------------------------------------------------------------
// 例1：偶発的凝集（何でも入る Utils）（4-4 例1）
// ------------------------------------------------------------

export class Utils {
  static formatDate(d) {
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  static calculateTax(amount) {
    return Math.floor(amount * 0.1);
  }

  static isValidEmail(s) {
    return typeof s === 'string' && s.includes('@');
  }

  static deepClone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  static shuffle(array) {
    return array.sort(() => Math.random() - 0.5);
  }

  static toSlug(s) {
    return String(s).toLowerCase().replace(/\s+/g, '-');
  }
}

// ------------------------------------------------------------
// 例2：スタンプ結合（必要なのは年齢だけなのに user 丸ごと渡す）（4-4 例2）
// ------------------------------------------------------------

export function canDrink(user) {
  return user.profile.birth.age >= 20;
}

export function checkAllUsers(users) {
  return users.filter((u) => canDrink(u));
}

// ------------------------------------------------------------
// 例3：制御結合（呼び出し側がフラグで中の分岐を操作する）（4-4 例3）
// ------------------------------------------------------------

export async function notifyUser(user) {
  await notifier.send(user, { skipValidation: true, useLegacyTemplate: true, silent: false });
}

// ------------------------------------------------------------
// 例4：共通結合（グローバルな可変状態）（4-4 例4）
// ------------------------------------------------------------

export let currentUser: any = null;

export async function login(userId) {
  currentUser = await userRepo.findById(userId);
}

export function logout() {
  currentUser = null;
}

// currentUser に依存していることが、シグネチャからは分からない
export function canEdit(targetUserId) {
  if (currentUser == null) return false;
  if (currentUser.id === targetUserId) return true;
  if (currentUser.role === 'admin') return true;
  return false;
}

// ------------------------------------------------------------
// 例5：低凝集な配置（4-4 例5）
//
// 「注文」に関する知識が3ファイルに散っている、という例。
// ここでは1ファイルに並べているが、実際のプロジェクトでは
//   priceUtil.ts   … 税の計算
//   orderHelper.ts … 送料の計算
//   constants.ts   … しきい値
// のように分かれていて、注文の仕様変更のたびに3ファイルを開くことになる。
// ------------------------------------------------------------

// constants.ts 相当
export const TAX = 0.1;
export const FREE = 5000;

// priceUtil.ts 相当
export function calcTax(amount) {
  return Math.floor(amount * TAX);
}

// orderHelper.ts 相当
export function calcShipping(amount) {
  return amount >= FREE ? 0 : 600;
}
