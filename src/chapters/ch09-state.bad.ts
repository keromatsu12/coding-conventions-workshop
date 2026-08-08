// ⚠️ 【意図的に悪く書かれた教材コード】です。実務で真似しないでください。
//
// 第9章 状態と不変性 — 9-6「コード例で確認する（Before / After）」の Before だけ。
// 対応する解説：docs/coding-conventions.md 第9章

import { userRepo } from './_support';

// ------------------------------------------------------------
// 例1：引数で渡された配列を破壊する（9-6 例1）
// ------------------------------------------------------------

export function topThree(scores) {
  scores.sort((a, b) => b - a);
  return scores.slice(0, 3);
}

export function useTopThree() {
  const scores = [70, 90, 50, 100];
  const top = topThree(scores);
  // 呼び出し側の scores も並び替わってしまっている
  return { top, scores };
}

// ------------------------------------------------------------
// 例2：ネストしたオブジェクトを部分的に書き換える（9-6 例2）
// ------------------------------------------------------------

export function activate(user) {
  user.status.isActive = true;
  user.status.updatedAt = new Date();
  user.history.push({ type: 'activated', at: new Date() });
  return user;
}

// ------------------------------------------------------------
// 例3：不変条件が守られない（9-6 例3）
// ------------------------------------------------------------

export class Cart {
  items: any[] = [];

  add(item) {
    this.items.push(item);
  }

  total() {
    return this.items.reduce((s, i) => s + i.price * i.quantity, 0);
  }
}

export function breakCart() {
  const cart = new Cart();
  cart.add({ price: 100, quantity: 1 });
  cart.items.push(null); // 外から不正な要素を入れられる
  cart.items = 'こわれた' as any; // 配列ですらなくなる
  return cart;
}

// ------------------------------------------------------------
// 例4：不正な状態を型で表現できてしまう（9-6 例4）
// ------------------------------------------------------------

export type Job = {
  id: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  startedAt?: Date;
  finishedAt?: Date;
  result?: string;
  error?: string;
};

export function makeImpossibleJob(): Job {
  // queued なのに結果もエラーもある、という状態が型として通ってしまう
  return {
    id: 'j1',
    status: 'queued',
    finishedAt: new Date(),
    result: 'ok',
    error: 'failed',
  };
}

export function describe(job: Job): string {
  if (job.status === 'done') {
    return job.result.toUpperCase();
  }
  return job.status;
}

// ------------------------------------------------------------
// 例5：モジュールレベルの可変キャッシュ（9-6 例5）
// ------------------------------------------------------------

let settingsCache: any = null;

export function loadSettings() {
  if (settingsCache == null) {
    settingsCache = { taxRate: 0.1, freeShipping: 5000 };
  }
  return settingsCache;
}

export function overrideTaxRate(rate) {
  settingsCache = loadSettings();
  settingsCache.taxRate = rate;
}

// ------------------------------------------------------------
// おまけ：モジュールレベルのキャッシュ（9-4、L2992-3006）
// ------------------------------------------------------------

const cache: any = {};

export async function getUser(id) {
  if (cache[id]) {
    return cache[id];
  }
  const user = await userRepo.findById(id);
  cache[id] = user;
  return user;
}
