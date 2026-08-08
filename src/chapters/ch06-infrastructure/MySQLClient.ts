// ⚠️ 【意図的に悪く書かれた教材コード】の一部です。
//
// 第6章 6-4 例3「依存の向き」用。
// このファイルは「インフラ層」のつもりで置いてあります。
// ch06-dependency.bad.ts（ドメイン層のつもり）が、ここを import してしまっている
// ＝ 依存の向きが逆になっている、というのが観察ポイントです。

import { db } from '../_support';

export class MySQLClient {
  async insert(table: string, row: any): Promise<void> {
    void row;
    await db.query(`SELECT * FROM ${table}`);
  }
}
