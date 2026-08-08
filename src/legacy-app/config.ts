// ⚠️ このファイルは【意図的に悪く書かれた教材コード】です。実務で真似しないでください。
//    直し方は docs/coding-conventions.md を参照してください。

// 設定
export const config = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'shop',
};

// APIキー
export const API_KEY = 'sk_test_DUMMY_DO_NOT_USE_0000000000000000';
export const SLACK_TOKEN = 'xoxb-DUMMY-DO-NOT-USE-000000000000';

// 管理者
export const ADMIN = 'admin@example.com';

// 環境変数
export function getEnv(k) {
  if (process.env[k]) {
    return process.env[k];
  } else {
    return null;
  }
}

export const API_URL = process.env.API_URL || 'https://api.example.com';

// 有効かどうか
export const flag = true;
