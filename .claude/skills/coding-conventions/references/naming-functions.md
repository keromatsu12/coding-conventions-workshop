# 命名・コメント・関数分割（第2〜3章）

## 良い名前の6条件

### ① 明確な単語を選ぶ

| 曖昧 | より明確 |
|---|---|
| `get` | `fetch`（ネットワーク越し）、`load`（ディスク）、`compute`（計算） |
| `size` | `height`, `numNodes`, `memoryBytes` |
| `stop` | `kill`（強制終了）、`pause`（再開可能） |
| `make` | `create`, `build`, `generate` |

`tmp` `data` `info` `retval` `flag` `manager` `handler` `util` は「何が入っているか」を一切伝えない。
（`tmp` は本当に一時的な入れ替え用途のときだけ許される）

### ② 抽象的でなく具体的に

```
❌ ServerCanStart()     … 「起動できる」の何を確認している?
✅ CanListenOnPort()    … ポートを掴めるかを確認していると分かる
```

### ③ 名前に情報を追加する（単位と状態）

```
❌ delay      → ✅ delaySecs
❌ size       → ✅ sizeMb
❌ limit      → ✅ maxItems
❌ password   → ✅ plaintextPassword   ← 平文だと一目で分かる
❌ html       → ✅ unescapedHtml       ← エスケープ前だと分かる
```

`setTimeout(delay)` の `delay` が秒かミリ秒か分からないことが、1000倍のバグを生む。

### ④ スコープに応じて長さを変える

- ループ変数（3行で死ぬ）: `i`, `x` で十分
- クラスのフィールド: 中程度
- 公開API・グローバル: 誤解ゼロが最優先。長くてよい

100ファイルから参照される名前をケチってはいけない。

### ⑤ 誤解されない名前にする

```
filter(list, "year <= 2011")
  → 「選び出す」? 「取り除く」? どちらにも読める
  → select() / exclude() のように動作を明示する

範囲を表すとき
  first / last  … 閉区間 [first, last]（last を含む）
  begin / end   … 半開区間 [begin, end)（end を含まない）

限界値を表すとき
  max_ / min_ を前に付ける（maxItems, minLength）
  ※ limit だけでは「以上」か「より大きい」か分からない
```

boolean は特に危険:

```
❌ disableSsl = false    … 二重否定。「SSLを使う」のか一瞬迷う
✅ useSsl = true         … 肯定形で書く

接頭辞: is / has / can / should / needs
✅ isActive, hasPermission, canEdit, shouldRetry
```

### ⑥ 一貫性を保つ

```
❌ fetchUser() / getOrder() / retrieveProduct()
✅ fetchUser() / fetchOrder() / fetchProduct()
```

読者は「違う名前＝違う意味」だと解釈する。同義語の乱立は、存在しない差異を想像させる。

業務用語とコード上の名前を一致させる（ユビキタス言語）:

```
「注文」→ Order    （Purchase や Transaction と混ぜない）
「取消」→ cancel   （delete や remove と区別する）
「確定」→ confirm
```

## 命名アンチパターン

| 悪い例 | 問題点 | 改善例 |
|---|---|---|
| `d`, `n`, `s` | 何の略か不明 | `elapsedDays`, `nodeCount` |
| `data`, `info` | 意味を持たない | 中身を表す具体名 |
| `flag` | 何のフラグか不明 | `isEnabled`, `hasExpired` |
| `temp`, `result` | 使い回されがち | 処理内容を表す名前 |
| `list1`, `list2` | 区別がつかない | `activeUsers`, `bannedUsers` |
| `XxxManager`, `XxxProcessor` | 責務が曖昧＝設計が曖昧 | 実際の役割を表す名前 |
| `getUserData()` | Data が冗長 | `getUser()` |
| ローマ字（`chumon`） | 英語と混在して検索性が落ちる | `order` に統一 |

> `Manager` / `Util` / `Helper` が出てきたら、命名の問題ではなく**設計の問題**。
> 「何をするクラスか説明できない」から曖昧な名前になっている。

## コメント

### 書くべきでないもの

- コードを読めば分かること（`i++ // iに1を足す`）
- ひどい名前の言い訳 → コメントを足すのではなく**名前を直す**
- 更新されずに嘘になったコメント

### 書くべきもの

- なぜこの実装にしたか（背景・意思決定）
- なぜ自明な方法を採らなかったか
- 落とし穴・注意点（「この順序は変えられない」）
- 全体像の要約（読者の地図になる）
- TODO / FIXME（既知の欠陥の明示）

```javascript
// ❌ 何をしているかの説明（コードを見れば分かる）
// ユーザーIDでソートする
users.sort((a, b) => a.id - b.id);

// ✅ なぜそうしているかの説明
// 外部APIがID昇順を前提にページングするため、ここで必ず整列させる
users.sort((a, b) => a.id - b.id);
```

### 判断フロー

```
コメントを書きたくなった
  → 名前を変えれば不要にならないか?  → なる: 名前を直す
  → 関数に切り出せば不要にならないか? → なる: 切り出す（関数名が説明になる）
  → どちらでもない: 「なぜ」を書く ＝ 本当に価値のあるコメント
```

### 記法

```
TODO:  後でやる（期限や担当が分かると尚よい）
FIXME: 既知の不具合。動くが正しくない
HACK:  応急処置。あるべき姿ではないと明示
NOTE:  読者への補足
WARN:  触ると壊れる箇所の警告
```

## 関数は「1つのこと」だけをする

### 判定法① 説明に「そして(and)」が入るか

「ユーザーを検証して、DBに保存して、メールを送る」→ 3つに分けるサイン。
関数名が `validateAndSaveUser` のように `And` を含むなら、ほぼ確実に分割対象。

### 判定法② 抽象レベルが混在していないか（SLAP）

```javascript
// ❌ 抽象度がバラバラ（読者が上下に振り回される）
function processOrder(order) {
  validateOrder(order);                                    // 高レベル
  const total = order.items.reduce((s, i) => s + i.price * i.qty, 0); // 低レベル
  const tax = Math.floor(total * 0.1);                     // 低レベル
  saveToDatabase(order, total + tax);                      // 高レベル
}

// ✅ 抽象度が揃っている（同じ高さの言葉が並ぶ）
function processOrder(order) {
  validateOrder(order);
  const total = calculateTotalWithTax(order);
  saveToDatabase(order, total);
}
```

**「抽象レベルを一段階だけ下げる原則」(SLAP)。** 関数の中身を読んだとき、同じ粒度の言葉が並んでいるのが理想。

### 判定法③ 「無関係の下位問題」を抽出できるか

本題（近い店を探す）に汎用処理（球面距離の計算）が混ざっていたら切り出す。
切り出した関数は**単独でテストでき、再利用でき、名前がドキュメントになる**。

## 分割サイン（チェックリスト）

| サイン | 意味 | 対処 |
|---|---|---|
| 関数が画面に収まらない | 責任過多 | 処理のまとまりごとに抽出 |
| ネストが3段以上 | 制御フローが複雑 | 早期リターン、ループ内処理の関数化 |
| 引数が4個以上 | 責任過多、または引数のまとまりがある | オブジェクトにまとめる／分割 |
| boolean引数がある | 中で処理が2分岐している | 2つの関数に分ける |
| 「ここから〜の処理」というコメント | そのブロックが関数の候補 | 抽出し、コメントを関数名にする |
| 一部だけコメントアウトして試したくなる | 責任が分かれている | 分割 |

```javascript
// ❌ 呼び出し側で意味が読めない
createUser(name, email, true);

// ✅ 意図が明確
createAdminUser(name, email);
createNormalUser(name, email);
```

## ネストを浅くする（早期リターン）

```javascript
// ❌ 矢印コード
function getDiscount(user) {
  if (user != null) {
    if (user.isActive) {
      if (user.membershipYears >= 3) { return 0.2; } else { return 0.1; }
    } else { return 0; }
  } else { return 0; }
}

// ✅ 例外的なケースを先に片付ける
function getDiscount(user) {
  if (user == null) return 0;
  if (!user.isActive) return 0;
  if (user.membershipYears >= 3) return 0.2;
  return 0.1;
}
```

**正常系のロジックを、ネストの一番浅いところに置く。** 読者は「本筋」だけを追える。

## 副作用（I/O）を分離する

```javascript
// ❌ 計算とI/Oが混在 → テストしづらい
function reportSalary(employeeId) {
  const emp = db.find(employeeId);        // I/O
  const salary = emp.base + emp.bonus;    // 計算
  console.log(`${emp.name}: ${salary}`);  // I/O
}

// ✅ 計算部分を純粋関数に
function calculateSalary(employee) {      // 引数と戻り値だけでテストできる
  return employee.base + employee.bonus;
}

function reportSalary(employeeId) {       // I/Oはここに集約
  const emp = db.find(employeeId);
  console.log(`${emp.name}: ${calculateSalary(emp)}`);
}
```

これが第9章（状態と不変性）・第11章（テスト）につながる最大の転換点。
