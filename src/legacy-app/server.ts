// ⚠️ このファイルは【意図的に悪く書かれた教材コード】です。実務で真似しないでください。
//    直し方は docs/coding-conventions.md を参照してください。

import { createApp, App } from '../fake-libs/httpServer';
import { createConnection } from '../fake-libs/mysql';
import { config, API_KEY } from './config';
import { g } from './globals';
import { UserManager } from './userManager';
import { proc, listOrdersWithUsers, loadDashboard } from './orderProcessor';
import { sendMonthlyReport } from './reportService';

const um = new UserManager();

export function buildApp(): App {
  const app = createApp();

  // ログイン確認
  const requireLogin = async (req, res, next) => {
    console.log('リクエスト', req.method, req.path, req.headers);
    const uid = req.headers['x-user-id'];
    if (!uid) {
      res.status(401).json({ message: 'ログインしてください' });
      return;
    }
    const conn = await createConnection(config);
    const rows = await conn.query(`SELECT * FROM users WHERE id = '${uid}'`);
    await conn.end();
    req.user = rows[0];
    g.currentUser = rows[0];
    next();
  };

  app.post('/api/login', async (req, res) => {
    const r = await um.login(req.body.email, req.body.password);
    if (!r.ok) {
      res.status(r.code).json({ message: r.message });
      return;
    }
    console.log('ログイン成功', r.user);
    res.status(200).json({ ok: true, user: r.user, apiKey: API_KEY });
  });

  app.post('/api/users', async (req, res) => {
    const u = await um.register(req.body, { skipValidation: false, useLegacyTemplate: false });
    if (u == null) {
      res.status(400).json({ message: '登録に失敗しました' });
      return;
    }
    console.log('登録', u);
    res.status(200).json(u);
  });

  app.get('/api/users/search', requireLogin, async (req, res) => {
    try {
      const rows = await um.search(req.query.keyword, req.query.sort || 'name');
      res.status(200).json(rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message, sql: e.sqlMessage, detail: e.sql });
    }
  });

  app.get('/api/orders/:id', requireLogin, async (req, res) => {
    const conn = await createConnection(config);
    const rows = await conn.query(`SELECT * FROM orders WHERE id = '${req.params.id}'`);
    await conn.end();
    res.status(200).json(rows[0]);
  });

  app.post('/api/orders', requireLogin, async (req, res) => {
    try {
      const t = await proc(req.body);
      res.status(200).json({ total: t, orderId: g.lastOrderId });
    } catch (e) {
      console.log(e);
      res.status(500).json({ message: 'エラー' });
    }
  });

  app.get('/api/orders', requireLogin, async (req, res) => {
    const list = await listOrdersWithUsers();
    res.status(200).json(list);
  });

  app.get('/api/dashboard/:userId', requireLogin, async (req, res) => {
    const d = await loadDashboard(req.params.userId);
    res.status(200).json(d);
  });

  app.get('/api/report/monthly', requireLogin, async (req, res) => {
    try {
      const body = await sendMonthlyReport();
      res.status(200).send(body);
    } catch (e) {}
  });

  // 挨拶ページ
  app.get('/welcome', async (req, res) => {
    const name = req.query.name;
    const html = '<html><body><div>ようこそ ' + name + ' さん</div></body></html>';
    res.status(200).send(html);
  });

  return app;
}
