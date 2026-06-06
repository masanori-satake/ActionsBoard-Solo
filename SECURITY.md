# Security Policy / セキュリティポリシー

## Supported Versions / サポート対象バージョン

We currently support the following versions for security updates.
現在、以下のバージョンについてセキュリティアップデートをサポートしています。

| Version | Supported |
| :------ | :-------: |
| 1.0.*   |    ✅     |
| < 1.0.0 |    ❌     |

---

## Reporting a Vulnerability / 脆弱性の報告方法

If you discover a potential security vulnerability, please use the GitHub Private Vulnerability Reporting feature.
セキュリティ上の脆弱性を発見された場合は、**GitHubのプライベート報告機能（Private Vulnerability Reporting）**を使用して報告してください。

### How to report / 報告手順:

1. On GitHub.com, navigate to the main page of the repository.
2. Under the repository name, click **Security**.
3. In the left sidebar, click **Vulnerability reporting**.
4. Click **Report a vulnerability**.
5. Fill in the details and click **Submit report**.

---

## Our Security Philosophy / セキュリティに関する設計指針

This project prioritizes user privacy and security through the following architectural choices:
本プロジェクトでは、ユーザーのプライバシーとセキュリティを最優先し、以下の設計指針を採用しています。

### 1. Local-Only Architecture / 完全ローカル動作

ActionsBoard-Solo operates entirely within your browser. All authentication tokens and monitoring settings are stored in `chrome.storage.local` on your device. No data is sent to external servers, ensuring your configuration remains private.
本拡張機能はブラウザ内で完結して動作します。すべての認証トークンや監視設定はデバイス上の `chrome.storage.local` に保存され、外部サーバーへの通信は一切行われません。

### 2. Vanilla JS (Zero Dependencies) / Vanilla JS の採用

By avoiding external frameworks and libraries, we eliminate the risk of "Dependency Hell" and supply chain attacks. The codebase is transparent and easy to audit for any security professional.
外部のフレームワークやライブラリに依存しないことで、依存関係の脆弱性やサプライチェーン攻撃のリスクを排除しています。コードの透明性が高く、セキュリティ監査も容易です。

### 3. Personal Access Tokens (PAT) Security / PATの取り扱い

Tokens are used only for direct communication with the GitHub API from your browser. They are never exported in configuration files and are stored securely using browser-provided local storage.
トークンは、ブラウザからGitHub APIと直接通信するためにのみ使用されます。設定エクスポートファイルには含まれず、ブラウザが提供するローカルストレージに安全に保管されます。

---

## Disclaimer / 免責事項

Please refer to the [README.md](README.md) and [LICENSE](LICENSE) for our full disclaimer.
詳細な免責事項については、[README.md](README.md) および [LICENSE](LICENSE) を参照してください。

This software is a personal open-source project and is provided "AS IS" without warranty of any kind. The developer shall not be liable for any damages (including data loss, work interruption, etc.) arising from the use of this software. Use at your own risk, as per the MIT License.
