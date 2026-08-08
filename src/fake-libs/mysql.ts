/**
 * ============================================================
 *  ⚠️ このファイルは【リファクタリング対象外】です。
 * ============================================================
 *
 * ワークショップを外部依存なしで動かすための「偽の MySQL ドライバ」です。
 * 本物の mysql2 と同じ形（createConnection / query / end）だけを真似た、
 * インメモリの簡易実装です。
 *
 * 教材上、重要な性質が 1 つあります：
 *
 *   この偽DBは、素朴な文字列パーサで SQL を解釈します。
 *   つまり **SQL インジェクションが本当に成立します。**
 *   「脆弱だと書いてあるコード」ではなく「実際に漏れるコード」を
 *   体験してもらうための作りです（第15章 15-2）。
 *
 * 演習で直すのは src/legacy-app/ と src/chapters/ 側です。ここは触りません。
 */

export interface ConnectionConfig {
  host: string;
  user: string;
  password: string;
  database: string;
}

export type Row = Record<string, any>;

/** 本物の DB 接続を張るのは高コスト、という事実を可視化するためのカウンタ（第18章）。 */
let connectionsCreated = 0;
let openConnections = 0;

export function getConnectionStats() {
  return { created: connectionsCreated, open: openConnections };
}

export function resetConnectionStats() {
  connectionsCreated = 0;
  openConnections = 0;
}

// ------------------------------------------------------------
// テーブル定義とシードデータ
// ------------------------------------------------------------

const TABLE_COLUMNS: Record<string, string[]> = {
  users: [
    'id',
    'name',
    'email',
    'password',
    'membership_years',
    'is_active',
    'address',
    'created_at',
  ],
  products: ['id', 'name', 'price', 'stock'],
  orders: ['id', 'user_id', 'total', 'status', 'created_at'],
  order_items: ['id', 'order_id', 'product_id', 'quantity', 'price'],
};

let tables: Record<string, Row[]> = {};

export function seedDatabase(): void {
  tables = {
    users: [
      {
        id: 'u1',
        name: '田中 太郎',
        email: 'tanaka@example.com',
        password: 'tanaka-pass',
        membership_years: 5,
        is_active: 1,
        address: '東京都千代田区1-1-1',
        created_at: '2019-04-01',
      },
      {
        id: 'u2',
        name: '鈴木 花子',
        email: 'suzuki@example.com',
        password: 'suzuki-pass',
        membership_years: 1,
        is_active: 1,
        address: '大阪府大阪市北区2-2-2',
        created_at: '2024-11-20',
      },
      {
        id: 'u3',
        name: '佐藤 次郎',
        email: 'sato@example.com',
        password: 'sato-pass',
        membership_years: 3,
        is_active: 0,
        address: '福岡県福岡市博多区3-3-3',
        created_at: '2022-01-15',
      },
    ],
    products: [
      { id: 'p1', name: 'キーボード', price: 8000, stock: 10 },
      { id: 'p2', name: 'マウス', price: 3000, stock: 4 },
      { id: 'p3', name: 'モニタ', price: 25000, stock: 0 },
    ],
    orders: [
      { id: 'o1', user_id: 'u1', total: 8800, status: 'paid', created_at: '2026-07-01' },
      { id: 'o2', user_id: 'u2', total: 3300, status: 'paid', created_at: '2026-07-03' },
      { id: 'o3', user_id: 'u1', total: 27500, status: 'shipped', created_at: '2026-07-11' },
    ],
    order_items: [
      { id: 'i1', order_id: 'o1', product_id: 'p1', quantity: 1, price: 8000 },
      { id: 'i2', order_id: 'o2', product_id: 'p2', quantity: 1, price: 3000 },
      { id: 'i3', order_id: 'o3', product_id: 'p3', quantity: 1, price: 25000 },
    ],
  };
}

seedDatabase();

// ------------------------------------------------------------
// 接続
// ------------------------------------------------------------

export class Connection {
  private closed = false;

  constructor(public readonly config: ConnectionConfig) {}

  async query(sql: string, params?: any[]): Promise<any> {
    if (this.closed) {
      throw new Error('接続は既に閉じられています');
    }
    // 実際の I/O レイテンシの代わり（第18章で「遅い」と分かるように）
    await tick();

    const bound = params && params.length > 0 ? bindParams(sql, params) : sql;

    let last: any = [];
    for (const statement of splitStatements(bound)) {
      last = execute(statement);
    }
    return last;
  }

  async end(): Promise<void> {
    if (!this.closed) {
      this.closed = true;
      openConnections--;
    }
  }
}

export async function createConnection(config: ConnectionConfig): Promise<Connection> {
  await tick();
  connectionsCreated++;
  openConnections++;
  return new Connection(config);
}

function tick(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

// ------------------------------------------------------------
// プレースホルダ（? ）の展開
// ------------------------------------------------------------

function bindParams(sql: string, params: any[]): string {
  let index = 0;
  let out = '';
  let quote: string | null = null;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (quote) {
      out += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      out += ch;
      continue;
    }
    if (ch === '?') {
      out += toSqlLiteral(params[index++]);
      continue;
    }
    out += ch;
  }
  return out;
}

function toSqlLiteral(value: any): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? '1' : '0';
  // ここでちゃんとエスケープするので、プレースホルダを使えば注入は成立しない
  return `'${String(value).replace(/'/g, "''")}'`;
}

// ------------------------------------------------------------
// 実行
// ------------------------------------------------------------

function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let quote: string | null = null;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === '-' && sql[i + 1] === '-') break; // 以降はコメント
    if (ch === ';') {
      statements.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  statements.push(current);

  return statements.map((s) => s.trim()).filter((s) => s.length > 0);
}

function execute(sql: string): any {
  const normalized = sql.replace(/\s+/g, ' ').trim();
  const head = normalized.split(' ')[0].toUpperCase();

  switch (head) {
    case 'SELECT':
      return executeSelect(normalized);
    case 'INSERT':
      return executeInsert(normalized);
    case 'UPDATE':
      return executeUpdate(normalized);
    case 'DELETE':
      return executeDelete(normalized);
    case 'DROP':
      return executeDrop(normalized);
    default:
      throw new SqlError(`この偽DBは "${head}" に対応していません: ${normalized}`, normalized);
  }
}

/** 本物の mysql2 のエラーに寄せた形（第10章 10-8 例4 の題材になる）。 */
export class SqlError extends Error {
  public code = 'ER_PARSE_ERROR';
  public sqlMessage: string;
  public sql: string;

  constructor(message: string, sql: string) {
    super(message);
    this.name = 'SqlError';
    this.sqlMessage = message;
    this.sql = sql;
  }
}

/** 大文字小文字を無視して、クォートの外にあるキーワードの位置を返す。 */
function indexOfKeyword(sql: string, keyword: string, from = 0): number {
  const upper = sql.toUpperCase();
  const target = keyword.toUpperCase();
  let quote: string | null = null;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      continue;
    }
    if (i >= from && upper.startsWith(target, i)) {
      const before = i === 0 ? ' ' : sql[i - 1];
      const after = sql[i + target.length] ?? ' ';
      if (/[\s(]/.test(before) && /[\s(]/.test(after)) return i;
    }
  }
  return -1;
}

function executeSelect(sql: string): Row[] {
  const fromAt = indexOfKeyword(sql, 'FROM');
  if (fromAt < 0) throw new SqlError('FROM が見つかりません', sql);

  const columnsPart = sql.slice('SELECT'.length, fromAt).trim();
  const rest = sql.slice(fromAt + 'FROM'.length).trim();

  const whereAt = indexOfKeyword(rest, 'WHERE');
  const orderAt = indexOfKeyword(rest, 'ORDER BY');
  const limitAt = indexOfKeyword(rest, 'LIMIT');

  const cut = [whereAt, orderAt, limitAt].filter((i) => i >= 0);
  const tableEnd = cut.length > 0 ? Math.min(...cut) : rest.length;
  const tableName = rest.slice(0, tableEnd).trim().split(' ')[0];

  const rows = requireTable(tableName, sql);

  let result = rows;
  if (whereAt >= 0) {
    const endCandidates = [orderAt, limitAt].filter((i) => i > whereAt);
    const end = endCandidates.length > 0 ? Math.min(...endCandidates) : rest.length;
    const condition = rest.slice(whereAt + 'WHERE'.length, end).trim();
    result = result.filter((row) => evaluateCondition(condition, row, sql));
  }

  if (orderAt >= 0) {
    const endCandidates = [limitAt].filter((i) => i > orderAt);
    const end = endCandidates.length > 0 ? Math.min(...endCandidates) : rest.length;
    const spec = rest.slice(orderAt + 'ORDER BY'.length, end).trim().split(' ');
    const column = spec[0];
    const descending = (spec[1] ?? '').toUpperCase() === 'DESC';
    result = [...result].sort((a, b) => compare(a[column], b[column]) * (descending ? -1 : 1));
  }

  if (limitAt >= 0) {
    const limit = Number(rest.slice(limitAt + 'LIMIT'.length).trim().split(' ')[0]);
    if (!Number.isNaN(limit)) result = result.slice(0, limit);
  }

  return result.map((row) => project(row, columnsPart));
}

function project(row: Row, columnsPart: string): Row {
  if (columnsPart === '*') return { ...row };

  const projected: Row = {};
  for (const raw of columnsPart.split(',')) {
    const column = raw.trim();
    if (column === '*') return { ...row };
    // COUNT(*) など関数はサポート外なので、名前をそのまま列名として扱う
    projected[column] = row[column];
  }
  return projected;
}

function executeInsert(sql: string): { affectedRows: number; insertId: any } {
  const match = /^INSERT\s+INTO\s+(\w+)\s*(?:\(([^)]*)\))?\s*VALUES\s*\((.*)\)$/i.exec(sql);
  if (!match) throw new SqlError('INSERT の構文を解釈できません', sql);

  const [, tableName, columnsPart, valuesPart] = match;
  const rows = requireTable(tableName, sql);
  const columns = columnsPart
    ? columnsPart.split(',').map((c) => c.trim())
    : TABLE_COLUMNS[tableName];

  const values = splitTopLevel(valuesPart).map((v) => parseLiteral(v.trim()));

  const row: Row = {};
  for (const column of TABLE_COLUMNS[tableName]) row[column] = null;
  columns.forEach((column, i) => {
    row[column] = values[i] ?? null;
  });

  rows.push(row);
  return { affectedRows: 1, insertId: row.id };
}

function executeUpdate(sql: string): { affectedRows: number } {
  const setAt = indexOfKeyword(sql, 'SET');
  if (setAt < 0) throw new SqlError('SET が見つかりません', sql);

  const tableName = sql.slice('UPDATE'.length, setAt).trim();
  const rows = requireTable(tableName, sql);

  const whereAt = indexOfKeyword(sql, 'WHERE', setAt);
  const assignmentsPart = sql.slice(setAt + 'SET'.length, whereAt < 0 ? sql.length : whereAt);
  const condition = whereAt < 0 ? null : sql.slice(whereAt + 'WHERE'.length).trim();

  const assignments = splitTopLevel(assignmentsPart).map((pair) => {
    const eq = pair.indexOf('=');
    return { column: pair.slice(0, eq).trim(), value: parseLiteral(pair.slice(eq + 1).trim()) };
  });

  let affectedRows = 0;
  for (const row of rows) {
    if (condition && !evaluateCondition(condition, row, sql)) continue;
    for (const { column, value } of assignments) row[column] = value;
    affectedRows++;
  }
  return { affectedRows };
}

function executeDelete(sql: string): { affectedRows: number } {
  const fromAt = indexOfKeyword(sql, 'FROM');
  if (fromAt < 0) throw new SqlError('FROM が見つかりません', sql);

  const whereAt = indexOfKeyword(sql, 'WHERE', fromAt);
  const tableName = sql
    .slice(fromAt + 'FROM'.length, whereAt < 0 ? sql.length : whereAt)
    .trim();
  const rows = requireTable(tableName, sql);
  const condition = whereAt < 0 ? null : sql.slice(whereAt + 'WHERE'.length).trim();

  const kept = condition ? rows.filter((row) => !evaluateCondition(condition, row, sql)) : [];
  const affectedRows = rows.length - kept.length;
  tables[tableName] = kept;
  return { affectedRows };
}

function executeDrop(sql: string): { affectedRows: number } {
  const match = /^DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?(\w+)$/i.exec(sql);
  if (!match) throw new SqlError('DROP の構文を解釈できません', sql);
  delete tables[match[1]];
  return { affectedRows: 0 };
}

function requireTable(name: string, sql: string): Row[] {
  const rows = tables[name];
  if (!rows) throw new SqlError(`テーブル '${name}' は存在しません`, sql);
  return rows;
}

// ------------------------------------------------------------
// WHERE 句の評価（ここが素朴なので注入が成立する）
// ------------------------------------------------------------

function evaluateCondition(condition: string, row: Row, sql: string): boolean {
  const orParts = splitByKeyword(condition, 'OR');
  return orParts.some((orPart) =>
    splitByKeyword(orPart, 'AND').every((andPart) => evaluateComparison(andPart.trim(), row, sql)),
  );
}

function evaluateComparison(expression: string, row: Row, sql: string): boolean {
  const match = /^(.+?)\s*(<=|>=|<>|!=|=|<|>|\bLIKE\b|\bIS NOT\b|\bIS\b)\s*(.+)$/i.exec(expression);
  if (!match) throw new SqlError(`条件式を解釈できません: ${expression}`, sql);

  const [, leftRaw, operatorRaw, rightRaw] = match;
  const operator = operatorRaw.toUpperCase();
  const left = resolveOperand(leftRaw.trim(), row);
  const right = resolveOperand(rightRaw.trim(), row);

  switch (operator) {
    case '=':
      return looseEquals(left, right);
    case '!=':
    case '<>':
      return !looseEquals(left, right);
    case '>':
      return compare(left, right) > 0;
    case '<':
      return compare(left, right) < 0;
    case '>=':
      return compare(left, right) >= 0;
    case '<=':
      return compare(left, right) <= 0;
    case 'LIKE':
      return likeMatch(String(left ?? ''), String(right ?? ''));
    case 'IS':
      return left === null || left === undefined;
    case 'IS NOT':
      return left !== null && left !== undefined;
    default:
      throw new SqlError(`未対応の演算子: ${operator}`, sql);
  }
}

/**
 * オペランドを値に変換する。
 * クォートされていれば literal、数値なら数値、それ以外は「列名」とみなす。
 * ── 列名として解決できないものを null にしてしまうこの寛容さが、
 *    注入されたゴミ条件をエラーにせず通してしまう原因でもある。
 */
function resolveOperand(token: string, row: Row): any {
  if (/^'.*'$/.test(token) || /^".*"$/.test(token)) {
    return token.slice(1, -1).replace(/''/g, "'");
  }
  if (/^-?\d+(\.\d+)?$/.test(token)) return Number(token);
  if (/^NULL$/i.test(token)) return null;
  if (/^TRUE$/i.test(token)) return 1;
  if (/^FALSE$/i.test(token)) return 0;
  return row[token] ?? null;
}

function looseEquals(a: any, b: any): boolean {
  if (a === null || b === null) return a === b;
  if (typeof a === 'number' || typeof b === 'number') return Number(a) === Number(b);
  return String(a) === String(b);
}

function compare(a: any, b: any): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return -1;
  if (b === null || b === undefined) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

function likeMatch(value: string, pattern: string): boolean {
  const regex = new RegExp(
    '^' + pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.') + '$',
    's',
  );
  return regex.test(value);
}

function parseLiteral(token: string): any {
  return resolveOperand(token, {});
}

/** カンマ区切りを、クォート/括弧の外だけで分割する。 */
function splitTopLevel(input: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  let quote: string | null = null;

  for (const ch of input) {
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts.filter((p) => p.trim().length > 0);
}

/** AND / OR を、クォートの外だけで分割する。 */
function splitByKeyword(input: string, keyword: string): string[] {
  const parts: string[] = [];
  let rest = input;

  for (;;) {
    const at = indexOfKeyword(rest, keyword);
    if (at < 0) break;
    parts.push(rest.slice(0, at));
    rest = rest.slice(at + keyword.length);
  }
  parts.push(rest);
  return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}
