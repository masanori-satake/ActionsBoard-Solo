## 2026/02/16 - APIレスポンス由来URLへのクレデンシャル送信時のオリジン検証とパラメータエンコード

**脆弱性:**

1. `fetchAndShowLogs` において、API レスポンスで返された `run.jobs_url` に対し、オリジン検証を行わずに Authorization ヘッダー（PAT）を付与して HTTP リクエストを送信していたため、サードパーティドメインや外部サーバへのトークン漏洩リスクが存在した。
2. GitHub API のリクエスト URL パスにユーザー入力または外部データ（`owner`, `repo`, `workflowFile`）を埋め込む際、`encodeURIComponent` によるエンコードが行われておらず、Path Traversal や API エンドポイントの変調が可能であった。
3. `chrome.tabs.create` でタブを開く際、`http:` / `https:` スキームの限定を行っておらず、非安全なスキーム（`javascript:` 等）が開かれる潜在的リスクがあった。

**学び:**
API から取得した URL や設定された動的 URL へクレデンシャル（PAT 等）を送信する際は、対象のホストおよびスキームが信頼できる認証設定のベース URL と一致しているかを常に確認する必要がある。また、API パス内の変数埋め込みには必ず `encodeURIComponent` を適用し、外部 URL 展開時はスキームチェックを実施しなければならない。

**予防策:**

- 外部レスポンス由来の URL へ認証ヘッダーを渡す前に `new URL(targetUrl).host === new URL(baseUrl).host` かつスキームが `http:`/`https:` であることを検証する標準処理を設ける。
- REST API パス構築時には常に `encodeURIComponent` を適用するコードスタイルを徹底する。
