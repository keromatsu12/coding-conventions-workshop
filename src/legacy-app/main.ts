// ⚠️ このファイルは【意図的に悪く書かれた教材コード】です。実務で真似しないでください。
//    直し方は docs/coding-conventions.md を参照してください。
//
// npm start でこのファイルが動きます。
// 実際にリクエストを数本流して、このアプリが「どう動いてしまうか」を見せます。

import { buildApp } from './server';
import { getConnectionStats, resetConnectionStats } from '../fake-libs/mysql';
import { getOutbox, clearOutbox } from '../fake-libs/mailer';
import { g } from './globals';

function section(title) {
  console.log('\n========================================');
  console.log(title);
  console.log('========================================');
}

async function main() {
  const app = buildApp();
  app.listen(3000);
  resetConnectionStats();
  clearOutbox();

  section('1. ログインする');
  const login = await app.handle('POST', '/api/login', {
    body: { email: 'tanaka@example.com', password: 'tanaka-pass' },
  });
  console.log('  status =', login.statusCode);
  console.log('  body   =', JSON.stringify(login.body));

  section('2. 注文する（キーボード1点 + マウス2点）');
  const order = await app.handle('POST', '/api/orders', {
    headers: { 'x-user-id': 'u1' },
    body: {
      u: { id: 'u1', email: 'tanaka@example.com', y: 5 },
      items: [
        { p: 8000, q: 1 },
        { p: 3000, q: 2 },
      ],
      c: null,
    },
  });
  console.log('  status =', order.statusCode);
  console.log('  body   =', JSON.stringify(order.body));

  section('3. ユーザー検索');
  const normal = await app.handle('GET', '/api/users/search', {
    headers: { 'x-user-id': 'u1' },
    query: { keyword: '田中' },
  });
  console.log('  keyword = "田中"       → ' + normal.body.length + '件');

  const injected = await app.handle('GET', '/api/users/search', {
    headers: { 'x-user-id': 'u1' },
    query: { keyword: "' OR '1'='1" },
  });
  console.log('  keyword = "\' OR \'1\'=\'1" → ' + injected.body.length + '件');
  console.log('  漏れた中身:');
  for (const row of injected.body) {
    console.log('    ', row.id, row.name, row.email, row.password, row.address);
  }

  section('4. 他人の注文を見る');
  const mine = await app.handle('GET', '/api/orders/o1', { headers: { 'x-user-id': 'u1' } });
  console.log('  u1 が o1 を見る → ', JSON.stringify(mine.body));
  const others = await app.handle('GET', '/api/orders/o1', { headers: { 'x-user-id': 'u2' } });
  console.log('  u2 が o1 を見る → ', JSON.stringify(others.body));

  section('5. メールアドレスが欠けた注文');
  const outboxBefore = getOutbox().length;
  const broken = await app.handle('POST', '/api/orders', {
    headers: { 'x-user-id': 'u2' },
    body: {
      u: { id: 'u2', y: 1 },
      items: [{ p: 3000, q: 1 }],
      c: null,
    },
  });
  console.log('  status =', broken.statusCode, ' body =', JSON.stringify(broken.body));
  console.log('  送信されたメール =', getOutbox().length - outboxBefore, '通');
  console.log('  ログに残ったエラー = （上を見てください）');

  section('6. 挨拶ページ');
  const welcome = await app.handle('GET', '/welcome', {
    query: { name: '<script>alert(document.cookie)</script>' },
  });
  console.log('  ' + welcome.body);

  section('7. 月次レポートを管理者に送る');
  await app.handle('GET', '/api/report/monthly', { headers: { 'x-user-id': 'u1' } });

  section('まとめ');
  const stats = getConnectionStats();
  console.log('  DB接続を張った回数 =', stats.created);
  console.log('  閉じ忘れている接続 =', stats.open);
  console.log('  送信したメール     =', getOutbox().length, '通');
  console.log('  グローバル状態     =', JSON.stringify(g));
  console.log('');
  console.log('  ここまでの出力のうち、何件が「本番なら事故」でしょうか。');
  console.log('  docs/coding-conventions.md 第20章 20-0 の欠陥一覧と突き合わせてみてください。');
}

main();
