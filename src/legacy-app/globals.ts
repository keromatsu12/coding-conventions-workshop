// ⚠️ このファイルは【意図的に悪く書かれた教材コード】です。実務で真似しないでください。
//    直し方は docs/coding-conventions.md を参照してください。

// アプリ全体で使う値
export const g: any = {
  currentUser: null,
  settingsCache: null,
  lastOrderId: null,
  orderCount: 0,
  total: 0,
  debug: false,
};

// キャッシュ
export let settingsCache: any = null;

export function setSettingsCache(v) {
  settingsCache = v;
}

// 設定を取得する
export function loadSettings() {
  if (settingsCache == null) {
    settingsCache = {
      taxRate: 0.1,
      freeShipping: 5000,
      shipping: 600,
      maxRetry: 3,
    };
  }
  return settingsCache;
}
