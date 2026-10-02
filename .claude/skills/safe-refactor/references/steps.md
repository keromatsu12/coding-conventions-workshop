# 改善ステップの詳細（第20章 総合ケーススタディ）

1つの汚いコードに、章の原則を順に適用していく手本。`src/legacy-app/orderProcessor.ts` の `proc` は、この出発点にクーポン・送料・グローバル状態を足した形をしている。
例は TypeScript、テストはこのリポジトリで動く `node:test` に置き換えてある（原文は Jest 風）。

## 20-0. 出発点

```ts
async function proc(d) {
  let t = 0;
  if (d != null) {
    if (d.items != null && d.items.length > 0) {
      for (let i = 0; i < d.items.length; i++) {
        t = t + d.items[i].p * d.items[i].q;
      }
      let tax = Math.floor(t * 0.1);
      t = t + tax;
      if (d.u.y >= 3) { t = t * 0.8; }
      try {
        const conn = await mysql.createConnection(config);
        await conn.query(`INSERT INTO orders VALUES ('${d.u.id}', ${t})`);
        await sendMail(d.u.email, "ご注文ありがとうございます:" + t);
      } catch (e) { }
      return t;
    } else { return 0; }
  } else { return 0; }
}
```

章ごとの問題:

```
第2章  proc, d, t, p, q, u.y … 名前から何も分からない
第3章  検証・計算・税・割引・保存・通知が1関数に。ネスト4段
第9章  t を何度も再代入。引数 d を信用して直接使用
第10章 catch{} で握りつぶし。DBもメールも失敗が握り潰される
第4章  責務がバラバラ（低凝集）／MySQLに直結（高結合）
第5章  割引ルールを増やすたびに if を足す（OCP違反）
第8章  業務ルールがインフラ（SQL）と同居
第11章 テスト不能（DBとメールサーバが必要）
第15章 SQLインジェクション。メールに内部情報
第18章 コネクションを毎回生成
```

---

## 20-1. 名前を直す（第2章）— リスクほぼゼロ

**構造は変えない。** 名前と定数だけ。

```ts
async function processOrder(order) {
  let totalAmount = 0;
  for (const item of order.items) {
    totalAmount += item.price * item.quantity;
  }
  const tax = Math.floor(totalAmount * TAX_RATE);
  // ...
  if (order.user.membershipYears >= LOYAL_MEMBER_YEARS) { /* ... */ }
}
```

- マジックナンバーを名前付き定数に（`0.1` → `TAX_RATE`、`3` → `LOYAL_MEMBER_YEARS`）。
- 外部に見えている名前（HTTPレスポンスのキー、DBの列名、出力文言）は**変えない**。それは振る舞いの変更。

## 20-2. ネストを浅くする（第3章）

```ts
async function processOrder(order) {
  if (order == null) return 0;          // ガード節
  if (!order.items?.length) return 0;   // ガード節

  // 本筋がネストの一番浅いところに来た
}
```

- 条件を反転するときは、`null` と `undefined`、空配列の扱いが変わらないよう注意する。

## 20-3. 計算とI/Oを分離する（第3・9章）— 最大の転換点

```ts
// 純粋関数：引数と戻り値だけ。DBもメールも知らない
export function calculateSubtotal(items: readonly OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function calculateTax(subtotal: number): number {
  return Math.floor(subtotal * TAX_RATE);
}

export function applyLoyaltyDiscount(amount: number, membershipYears: number): number {
  return membershipYears >= LOYAL_MEMBER_YEARS ? amount * LOYAL_DISCOUNT_RATE : amount;
}
```

```
processOrder（I/Oを持つ薄い殻）
  └─ 金額計算（純粋・テスト超簡単）★
```

- 切り出すときは**計算順序を変えない**（税→割引か、割引→税かで金額が変わる）。
- 端数処理（`Math.floor` の位置）も元のまま。

## 20-4. テストを書く（第11・17章）— ★ここまで来れば大きな成果

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateSubtotal, calculateTax, applyLoyaltyDiscount } from './orderCalculation';

test('小計に10%の税が加算される', () => {
  const items = [{ price: 100, quantity: 2 }];

  const tax = calculateTax(calculateSubtotal(items));

  assert.equal(tax, 20);
});

test('会員年数3年以上は20%割引', () => {
  assert.equal(applyLoyaltyDiscount(1000, 3), 800);
});

test('会員年数2年は割引なし', () => {   // 境界値
  assert.equal(applyLoyaltyDiscount(1000, 2), 1000);
});
```

実行: `npx tsc && node --test dist/<path>.test.js`

## 20-5. エラー処理を正す（第10・15章）— 振る舞いが変わる。`fix:` で別コミット

```ts
// ❌ 握りつぶし＋SQLインジェクション
catch (e) {}
conn.query(`INSERT INTO orders VALUES ('${d.u.id}', ${t})`);

// ✅ プレースホルダ＋原因を保持して投げ直す
try {
  await this.repository.save(order, totalAmount);
} catch (e) {
  throw new OrderSaveError(`注文の保存に失敗: userId=${order.user.id}`, { cause: e });
}
```

メール送信の失敗で注文全体を失敗させるべきかは**業務判断**。勝手に決めず、ユーザーに確認する（一般的には「注文は成立、メールは非同期リトライ」）。

## 20-6. 責務を分割する（第4・5章）

```
Before: processOrder が 検証・計算・割引・DB保存・メール送信 を全部やる
After : PlaceOrderUseCase（流れの調整）
          ├─ Order（計算）
          ├─ OrderRepository（保存）
          └─ Notifier（通知）
```

割引ルールは OCP に従って部品化する:

```ts
const rules: DiscountRule[] = [loyaltyDiscount, campaignDiscount, couponDiscount];
const finalAmount = rules.reduce((amount, rule) => rule.apply(amount, context), subtotal);
```

## 20-7. 依存を逆転させる（第6・8章）

```ts
// ドメイン層がインターフェースを所有する
interface OrderRepository {
  save(order: Order): Promise<void>;
}

class PlaceOrderUseCase {
  constructor(
    private readonly repository: OrderRepository,   // 抽象に依存（DI）
    private readonly notifier: Notifier,
  ) {}

  async execute(order: Order): Promise<number> {
    const total = order.calculateTotal();   // 業務ルールは Order が持つ
    await this.repository.save(order);
    await this.notifier.notifyOrderPlaced(order);
    return total;
  }
}

// テスト：DBもメールサーバも不要
const useCase = new PlaceOrderUseCase(new InMemoryOrderRepository(), new SpyNotifier());
```

組み立て（具体実装の `new`）は `main.ts` だけが知る。

## 20-8. 配置を整える（第7章）

```
src/order/                         ← 機能で分ける
├── domain/
│   ├── Order.ts                   ← 業務ルール（税・割引）
│   ├── DiscountRule.ts
│   └── OrderRepository.ts         ← インターフェース（DIP）
├── application/
│   └── PlaceOrderUseCase.ts
├── infrastructure/
│   ├── MySQLOrderRepository.ts    ← 実装
│   └── EmailNotifier.ts
├── presentation/
│   └── OrderController.ts
└── index.ts                       ← 公開する窓口だけ
```

ファイル移動は**単独コミット**にする（中身の変更と混ぜると差分が読めない）。

## 20-9. 到達点と止めどき

| | Before | After |
| --- | --- | --- |
| 読解にかかる時間 | 10分以上 | 各ファイル30秒 |
| テスト | 不可能 | ミリ秒で実行 |
| 割引ルールの追加 | if文を追記・危険 | ファイル追加のみ |
| DBの差し替え | 全面書き換え | 実装1つ追加 |
| SQLインジェクション | 脆弱 | 対策済み |

> **この全ステップを一度にやってはいけない。**
> 20-1 → 20-4（テスト）まで進めれば既に大きな成果。
> 20-6 以降は「その機能を頻繁に変更する見込みがあるか」で判断する（19-2 過剰設計の警告）。
