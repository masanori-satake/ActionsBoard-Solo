## 2026/02/16 - APIレスポンス由来URLへのクレデンシャル送信時のオリジン検証とパラメータエンコード

**脆弱性:**

1. `fetchAndShowLogs` において、API レスポンスで返された `run.jobs_url` に対し、オリジン検証を行わずに Authorization ヘッダー（PAT）を付与して HTTP リクエストを送信していたため、サードパーティドメインや外部サーバへのトークン漏洩リスクが存在した。
2. GitHub API のリクエスト URL パスにユーザー入力または外部データ（`owner`, `repo`, `workflowFile`）を埋め込む際、`encodeURIComponent` によるエンコードが行われておらず、Path Traversal や API エンドポイントの変調が可能であった。
3. `chrome.tabs.create` でタブを開く際、`http:` / `https:` スキームの限定を行っておらず、非安全なスキーム（`javascript:` 等）が開かれる潜在的リスクがあった。

**学び:**
API から取得した URL や設定された動的 URL へクレデンシャル（PAT 等）を送信する際は、対象のホストおよびスキームが信頼できる認証設定のベース URL と一致しているかを常に確認する必要がある。また、API パス内の変数埋め込みには必ず `encodeURIComponent` を適用し、外部 URL 展開時はスキームチェックを実施しなければならない。

**予防策:**

- 外部レスポンス由来の URL へ認証ヘッダーを渡す前に `new URL(targetUrl).origin === new URL(baseUrl).origin` でオリジンが完全に一致することを検証する標準処理を設ける。
- REST API パス構築時には常に `encodeURIComponent` を適用するコードスタイルを徹底する。

## 2026/09/20 - 通知URL解析の分離文字安全性と認証BaseURLスキーム検証

**脆弱性:**

1. デスクトップ通知のクリックハンドラにおいて `notificationId.split('|')` で URL をパースしていたため、URL 内のクエリパラメータにパイプ文字 `|` が含まれていた場合に URL が途中で切断・破棄される問題があった。
2. 認証設定の `baseUrl` 入力および検証（`testAuthConfig` / `validateUrlWithAuth`）において、`http:` / `https:` プロトコルの明示的検証が行われておらず、非標準スキームや無効な URL の指定時に未捕捉の例外や非安全な通信が発生する潜在的リスクが存在した。

**学び:**
文字列を区切り文字でパースして ID に埋め込む構造では、データ自体に区切り文字が含まれる可能性を考慮し、単純な `split` ではなく最初と最後のインデックス（`indexOf` / `lastIndexOf`）を用いて中間部分を正確に抽出する必要がある。また、ユーザー設定可能な API Base URL に対しては必ずプロトコルスキーム（`http:` / `https:`）および URL 妥当性の検証を行う防御的プログラミングが必要である。

**予防策:**

- 区切り文字を用いた ID 文字列からのデータ抽出には `substring(firstPipe + 1, lastPipe)` などの安全な範囲抽出を使用する。
- 外部設定の Base URL に対する検証関数では `try...catch` で保護したうえで `protocol === 'http:' || protocol === 'https:'` のチェックを標準化する。

## 2026/09/23 - 設定ファイルインポート時のBaseURLスキーム検証と通知URL構文安全性

**脆弱性:**

1. 設定JSONインポート処理（`import-config`）において、インポートされた `authConfigs` 内の `baseUrl` に対するスキーム検証が行われておらず、非標準/危険なプロトコル（`javascript:` 等）や無効なURL文字列がストレージに保存されるリスクが存在した。
2. `parseNotificationUrl` において、`new URL` による構文検証が行われておらず、構文エラーを含む不適切なHTTP URL文字列が `chrome.tabs.create` に渡された場合に未捕捉の例外が発生する潜在的リスクがあった。

**学び:**
UI上のフォーム入力値だけでなく、JSONファイル等の外部データインポート時にも一貫してプロトコルスキーム（`http:` / `https:`）と `new URL` による構造・構文バリデーションを適用する必要がある。

**予防策:**

- 設定インポート時には常に `new URL()` の `try...catch` と `protocol === 'http:' || protocol === 'https:'` チェックを適用し、不適切な場合は安全なデフォルト値へフォールバックさせる。
