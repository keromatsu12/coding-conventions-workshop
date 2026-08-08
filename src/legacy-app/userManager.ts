// ⚠️ このファイルは【意図的に悪く書かれた教材コード】です。実務で真似しないでください。
//    直し方は docs/coding-conventions.md を参照してください。

import { createConnection } from '../fake-libs/mysql';
import { sendMail } from '../fake-libs/mailer';
import { config, ADMIN } from './config';
import { g } from './globals';
import { Utils } from './utils';

export class UserManager {
  db: any;

  constructor() {
    // ここで実装を直接生成している
    this.db = null;
  }

  async connect() {
    this.db = await createConnection(config);
    return this.db;
  }

  // ユーザーを検証する
  validate(u) {
    if (u == null) return false;
    if (u.name == null || u.name === '') return false;
    if (!Utils.isValidEmail(u.email)) return false;
    return true;
  }

  // パスワードを変換する
  hashPassword(pw) {
    // 簡易的に難読化しておく
    let s = '';
    for (let i = 0; i < pw.length; i++) {
      s = s + String.fromCharCode(pw.charCodeAt(i) + 1);
    }
    return Buffer.from(s).toString('base64');
  }

  async save(u) {
    const conn = await this.connect();
    await conn.query(
      `INSERT INTO users VALUES ('${u.id}', '${u.name}', '${u.email}', '${u.password}', ${u.membership_years || 0}, 1, '${u.address || ''}', '${Utils.formatDate(new Date())}')`,
    );
    await conn.end();
    console.log('ユーザーを保存しました', u);
    return u;
  }

  async sendWelcome(u, useLegacyTemplate) {
    if (useLegacyTemplate) {
      await sendMail(u.email, 'ようこそ', 'ようこそ ' + u.name + ' さん(旧テンプレート)');
    } else {
      await sendMail(
        u.email,
        'ようこそ',
        'ようこそ ' + u.name + ' さん\nパスワード:' + u.password + '\n問い合わせ:' + ADMIN,
      );
    }
  }

  // 登録する
  async register(body, options) {
    if (!options.skipValidation) {
      if (!this.validate(body)) {
        return null;
      }
    }
    body.id = 'u' + Math.floor(Math.random() * 10000);
    body.password = this.hashPassword(body.password || '');
    await this.save(body);
    try {
      await this.sendWelcome(body, options.useLegacyTemplate);
    } catch (e) {}
    return body;
  }

  async login(email, password) {
    const conn = await this.connect();
    const rows = await conn.query(`SELECT * FROM users WHERE email = '${email}'`);
    await conn.end();
    if (rows.length === 0) {
      return { ok: false, code: 404, message: 'このメールアドレスは未登録です' };
    }
    if (rows[0].password !== password) {
      return { ok: false, code: 401, message: 'パスワードが違います' };
    }
    g.currentUser = rows[0];
    return { ok: true, code: 200, user: rows[0] };
  }

  // 編集できるか
  canEdit(targetUserId) {
    if (g.currentUser == null) return false;
    if (g.currentUser.id === targetUserId) return true;
    if (g.currentUser.role === 'admin') return true;
    return false;
  }

  // 表示用のモデルにする
  toModel(row) {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      password: row.password,
      status: {
        isActive: row.is_active === 1,
        updatedAt: null,
      },
      profile: {
        birth: {
          age: 2026 - Number(String(row.created_at).slice(0, 4)) + 20,
        },
      },
    };
  }

  // 年齢を確認する
  canDrink(user) {
    return user.profile.birth.age >= 20;
  }

  // 有効にする
  activate(user) {
    user.status.isActive = true;
    user.status.updatedAt = new Date();
    return user;
  }

  // 名前で並べ替える
  sortByName(users) {
    users.sort((a, b) => (a.name > b.name ? 1 : -1));
    return users;
  }

  async update(user, options) {
    if (!options.skipValidation) {
      if (!this.validate(user)) return null;
    }
    const conn = await this.connect();
    await conn.query(
      `UPDATE users SET name = '${user.name}', email = '${user.email}' WHERE id = '${user.id}'`,
    );
    await conn.end();
    if (options.notify) {
      await this.sendWelcome(user, options.useLegacyTemplate);
    }
    return user;
  }

  // ユーザーを探す
  async search(keyword, sortColumn) {
    const conn = await this.connect();
    const rows = await conn.query(
      `SELECT * FROM users WHERE name LIKE '%${keyword}%' ORDER BY ${sortColumn}`,
    );
    await conn.end();
    return rows;
  }
}
