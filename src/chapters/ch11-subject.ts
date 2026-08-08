/**
 * ============================================================
 *  ⚠️ このファイルは【リファクタリング対象外】です。
 * ============================================================
 *
 * 第11章のスニペット（ch11-testing.bad.test.ts）が「テスト対象」にする実装です。
 * 第11章の題材は **テストの書き方** なので、こちら側は普通に書いてあります。
 * 悪いのはテストの側です。
 */

export const TAX_RATE = 0.1;
export const FREE_SHIPPING_YEN = 5000;
export const SHIPPING_FEE_YEN = 600;
export const LOYAL_MEMBER_YEARS = 3;

export function calculateSubtotal(items: { price: number; quantity: number }[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function calculateTax(subtotal: number): number {
  return Math.floor(subtotal * TAX_RATE);
}

export function calculateShipping(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_YEN ? 0 : SHIPPING_FEE_YEN;
}

export function calculateDiscount(membershipYears: number, amount: number): number {
  return membershipYears >= LOYAL_MEMBER_YEARS ? Math.floor(amount * 0.2) : 0;
}

export function isExpired(session: { expiresAt: Date }): boolean {
  return session.expiresAt.getTime() < Date.now();
}

export interface UserDb {
  beginTransaction(): void;
  insertUserRow(user: any): void;
  insertProfileRow(user: any): void;
  commit(): void;
}

export function registerUser(user: any, db: UserDb): { id: string } {
  db.beginTransaction();
  db.insertUserRow(user);
  db.insertProfileRow(user);
  db.commit();
  return { id: user.id };
}

export interface OrderDeps {
  save(order: any): Promise<void>;
  notify(email: string, message: string): Promise<void>;
  now(): Date;
  newId(): string;
}

export async function processOrder(order: any, deps: OrderDeps): Promise<number> {
  const subtotal = calculateSubtotal(order.items);
  const tax = calculateTax(subtotal);
  const discount = calculateDiscount(order.membershipYears, subtotal + tax);
  const shipping = calculateShipping(subtotal);
  const total = subtotal + tax - discount + shipping;

  await deps.save({ id: deps.newId(), total, createdAt: deps.now() });
  await deps.notify(order.email, `ご注文ありがとうございます: ${total}`);
  return total;
}
