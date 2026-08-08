// ⚠️ 【意図的に悪く書かれた教材コード】です。実務で真似しないでください。
//
// 第11章 テストによる品質保証 — 11-12「コード例で確認する（Before / After）」の Before だけ。
// 対応する解説：docs/coding-conventions.md 第11章（11-4 良いテストの条件 / 11-11 アンチパターン）
//
// 実行： npm run test:bad
//
// このファイルは「テストが緑になること」を目的に書かれていません。
// 何本が通り、何本が落ち、そして **通っているのに何も守っていないテストがどれか**
// を確かめるためのものです。

import test from 'node:test';
import assert from 'node:assert';

import {
  calculateDiscount,
  calculateShipping,
  calculateSubtotal,
  calculateTax,
  isExpired,
  processOrder,
  registerUser,
  UserDb,
} from './ch11-subject';

// ------------------------------------------------------------
// 例1：assert のないテスト（11-12 例1）
// ------------------------------------------------------------

test('注文処理', async () => {
  const order = {
    items: [{ price: 100, quantity: 2 }],
    membershipYears: 0,
    email: 'a@example.com',
  };
  await processOrder(order, {
    save: async () => {},
    notify: async () => {},
    now: () => new Date(),
    newId: () => 'o1',
  });
});

// ------------------------------------------------------------
// 例2：実装の詳細をテストしている（11-12 例2）
// ------------------------------------------------------------

test('registerUser', () => {
  const calls: string[] = [];
  const db: UserDb = {
    beginTransaction: () => calls.push('beginTransaction'),
    insertUserRow: () => calls.push('insertUserRow'),
    insertProfileRow: () => calls.push('insertProfileRow'),
    commit: () => calls.push('commit'),
  };

  registerUser({ id: 'u1' }, db);

  assert.deepStrictEqual(calls, [
    'beginTransaction',
    'insertUserRow',
    'insertProfileRow',
    'commit',
  ]);
});

// ------------------------------------------------------------
// 例3：1つのテストに複数の観点（11-12 例3）
// ------------------------------------------------------------

test('割引', () => {
  assert.strictEqual(calculateDiscount(3, 1000), 200);
  assert.strictEqual(calculateDiscount(0, 1000), 0);
  assert.strictEqual(calculateTax(1000), 100);
  assert.strictEqual(calculateShipping(6000), 0);
  assert.strictEqual(calculateSubtotal([{ price: 100, quantity: 2 }]), 200);
});

// ------------------------------------------------------------
// 例4：テストの中に分岐とループ（11-12 例4）
// ------------------------------------------------------------

test('送料', () => {
  const cases = [4000, 5000, 6000, 0];
  for (const amount of cases) {
    if (amount >= 5000) {
      assert.strictEqual(calculateShipping(amount), 0);
    } else {
      if (amount === 0) {
        assert.strictEqual(calculateShipping(amount), 600);
      } else {
        assert.strictEqual(calculateShipping(amount), 600);
      }
    }
  }
});

// ------------------------------------------------------------
// 例5：現在時刻に依存している（11-12 例5）
//
// これは書かれた当時（2025年）は通っていました。
// ------------------------------------------------------------

test('セッションはまだ有効', () => {
  assert.strictEqual(isExpired({ expiresAt: new Date('2026-01-01') }), false);
});

// ------------------------------------------------------------
// 例6：モックだらけで、何を確かめているのか分からない（11-12 例6）
// ------------------------------------------------------------

test('注文が保存され通知される', async () => {
  const saved: any[] = [];
  const notified: any[] = [];
  const deps = {
    save: async (o: any) => {
      saved.push(o);
    },
    notify: async (to: string, m: string) => {
      notified.push([to, m]);
    },
    now: () => new Date('2026-01-01'),
    newId: () => 'o1',
  };

  await processOrder(
    { items: [{ price: 100, quantity: 2 }], membershipYears: 0, email: 'a@example.com' },
    deps,
  );

  assert.strictEqual(saved.length, 1);
  assert.strictEqual(notified.length, 1);
  assert.strictEqual(saved[0].id, 'o1');
  assert.deepStrictEqual(saved[0].createdAt, new Date('2026-01-01'));
});

// ------------------------------------------------------------
// 例7：テスト名から何も分からない（11-12 例7）
// ------------------------------------------------------------

test('test1', () => {
  assert.strictEqual(calculateShipping(6000), 0);
});

test('calculateShipping', () => {
  assert.strictEqual(calculateShipping(100), 600);
});

test('エラーケース', () => {
  assert.strictEqual(calculateDiscount(0, 1000), 0);
});
