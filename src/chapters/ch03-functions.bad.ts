// ⚠️ 【意図的に悪く書かれた教材コード】です。実務で真似しないでください。
//
// 第3章 関数の分割基準 — 3-5「コード例で確認する（Before / After）」の Before だけ。
// 対応する解説：docs/coding-conventions.md 第3章（3-1 単一責任 / 3-3 ネスト / 3-4 副作用）

import { db, mailer, userRepo, orderRepo, productRepo } from './_support';

// ------------------------------------------------------------
// 例1：boolean 引数で関数が2つに割れている（3-5 例1）
// ------------------------------------------------------------

export async function saveUser(user, sendMailFlag) {
  await db.save(user);
  if (sendMailFlag) {
    await mailer.send(user.email, '登録完了', 'ご登録ありがとうございます');
  } else {
    await db.save({ type: 'audit', userId: user.id });
  }
}

export async function callSaveUser(user) {
  await saveUser(user, true);
}

// ------------------------------------------------------------
// 例2：引数が多すぎる（3-5 例2）
// ------------------------------------------------------------

export async function createOrder(
  userId,
  productId,
  quantity,
  couponCode,
  isGift,
  message,
  addressId,
) {
  const product = await productRepo.findById(productId);
  return {
    userId,
    productId,
    quantity,
    couponCode,
    isGift,
    message,
    addressId,
    total: product.price * quantity,
  };
}

export async function callCreateOrder() {
  return createOrder('u1', 'p1', 2, null, true, '', 'a1');
}

// ------------------------------------------------------------
// 例3：ループの中に複数の関心事（3-5 例3）
// ------------------------------------------------------------

export function summarize(orders) {
  let sum = 0;
  const big = [];
  for (const o of orders) {
    sum += o.total;
    if (o.total > 10000) {
      big.push(o);
    }
    console.log(`注文 ${o.id}: ${o.total}円`);
  }
  console.log(`合計 ${sum}円 / 高額 ${big.length}件`);
  return sum;
}

// ------------------------------------------------------------
// 例4：else が不要（3-5 例4）
// ------------------------------------------------------------

export function getShippingFee(order) {
  if (order != null) {
    if (order.items != null) {
      if (order.total >= 5000) {
        return 0;
      } else {
        if (order.isExpress) {
          return 1200;
        } else {
          return 600;
        }
      }
    } else {
      return 0;
    }
  } else {
    return 0;
  }
}

// ------------------------------------------------------------
// 例5：条件式に名前がついていない（3-5 例5）
// ------------------------------------------------------------

export function canCancel(order, user) {
  if (
    order.status === 'paid' &&
    Date.now() - new Date(order.created_at).getTime() < 86400000 &&
    user.is_active === 1 &&
    order.total < 100000
  ) {
    return true;
  }
  return false;
}

// ------------------------------------------------------------
// 例6：出力引数（3-5 例6）
// ------------------------------------------------------------

export function collectHighValue(orders, result) {
  for (const o of orders) {
    if (o.total > 10000) {
      result.push(o);
    }
  }
}

export function useCollectHighValue(orders) {
  const result = [];
  collectHighValue(orders, result);
  return result;
}

// ------------------------------------------------------------
// 例7：早すぎる共通化（DRY の誤用）（3-5 例7）
// ------------------------------------------------------------

export function process(item, type) {
  if (type === 'order') {
    return { label: '注文', amount: item.total, tax: Math.floor(item.total * 0.1) };
  } else if (type === 'product') {
    return { label: '商品', amount: item.price, tax: Math.floor(item.price * 0.1) };
  } else if (type === 'user') {
    return { label: '会員', amount: item.membership_years, tax: 0 };
  }
  return { label: '不明', amount: 0, tax: 0 };
}

// ------------------------------------------------------------
// おまけ1：抽象レベルの混在（3-1、L958-979）
// ------------------------------------------------------------

export async function processOrder(order) {
  validateOrder(order);
  const total = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const tax = Math.floor(total * 0.1);
  await orderRepo.create({ ...order, total: total + tax });
  await mailer.send(order.email, '注文完了', '注文が完了しました');
}

function validateOrder(order) {
  if (order == null) throw new Error('注文がありません');
}

// ------------------------------------------------------------
// おまけ2：関係のない部分問題が埋まっている（3-1、L1006-1021）
// ------------------------------------------------------------

export function findClosestLocation(lat, lng, locations) {
  let closest = null;
  let min = Number.MAX_VALUE;
  for (const loc of locations) {
    const lat1 = (lat * Math.PI) / 180;
    const lat2 = (loc.lat * Math.PI) / 180;
    const dLat = ((loc.lat - lat) * Math.PI) / 180;
    const dLng = ((loc.lng - lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const d = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    if (d < min) {
      min = d;
      closest = loc;
    }
  }
  return closest;
}

// ------------------------------------------------------------
// おまけ3：4段ネストの矢印コード（3-3、L1078-1103）
// ------------------------------------------------------------

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
        return 0.1;
      }
    } else {
      return 0;
    }
  } else {
    return 0;
  }
}

// ------------------------------------------------------------
// おまけ4：計算と I/O が混ざっている（3-4、L1123-1139）
// ------------------------------------------------------------

export async function reportSalary(userId) {
  const user = await userRepo.findById(userId);
  const base = user.membership_years * 10000;
  const bonus = base > 30000 ? base * 0.2 : 0;
  const total = base + bonus;
  console.log(`${user.name} の支給額: ${total}円`);
  await db.save({ userId, total });
  return total;
}
