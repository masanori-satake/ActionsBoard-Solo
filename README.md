# ActionsBoard-Solo

[![version](https://img.shields.io/badge/version-1.0.4-blue)](projects/app/manifest.json)
[![Chrome Web Store Version](https://img.shields.io/badge/Chrome%20Web%20Store-v1.0.2-blue)](https://chromewebstore.google.com/detail/oofegjdjnldkikigimkadlleaiolionm)
[![License-MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Privacy-Local Only](https://img.shields.io/badge/Privacy-Local%20Only-brightgreen)](#%E3%83%97%E3%83%A9%E3%82%A4%E3%83%90%E3%82%B7%E3%83%BC%E3%81%A8%E3%82%BB%E3%82%AD%E3%83%A5%E3%83%AA%E3%83%86%E3%82%A3)
[![Manifest-V3](https://img.shields.io/badge/Manifest-V3-orange)](projects/app/manifest.json)

〜GitHub Actions の状態を自分専用の視点でスマートに監視する、ローカル完結型ダッシュボード〜

## プロジェクト概要

**ActionsBoard-Solo** は、GitHub Actions の実行状態と GitHub Pages のデプロイステータスをリアルタイムで追跡し、開発者の「待ち時間」を最小化するための Chrome 拡張機能です。

複数リポジトリを跨ぐプロジェクトにおいて、情報が分散しがちな GitHub Actions の状態を、ユーザーの役割（開発者、チームリード、運用保守）に合わせた「コンテキスト指向」の視点で集約します。外部サーバーを介さず、ブラウザから直接 GitHub API を使用するローカル完結型の設計です。

設計思想や行動指針については [AGENTS.md](AGENTS.md) を参照してください。

## 特徴

- **コンテキスト指向型ダッシュボード:** 自分のアクティビティ、チーム全体の健全性、あるいは運用バッチの監視など、目的に合わせた表示モードの切り替えが可能です。
- **2段階デプロイ追跡:** Actions の完了だけでなく、その後の GitHub Pages への反映（デプロイ完了）までを一気通貫で監視。
- **ノイズレス通知:** 自分に関連する重要な変更の状態変化のみを通知し、認知負荷を軽減します。
- **アダプティブ・ポーリング:** ダッシュボード利用時は30秒間隔、バックグラウンド時は数分間隔と、状況に応じて API 通信頻度を最適化。
- **Material Design 3:** モダンで直感的なユーザーインターフェースを採用。

## インストール方法

### 🚀 Chrome ウェブストアからインストール（推奨）

[![Available in the Chrome Web Store](projects/web/assets/chrome-web-store-badge.png)](https://chromewebstore.google.com/detail/oofegjdjnldkikigimkadlleaiolionm)

### 🛠️ ソースコードからインストール

1. このリポジトリをクローンまたはZIPダウンロードします。
2. ブラウザで拡張機能管理ページを開きます（Chrome: `chrome://extensions`）。
3. 「デベロッパー モード」をオンにします。
4. 「パッケージ化されていない拡張機能を読み込む」ボタンをクリックし、`projects/app` フォルダを選択します。

## 使い方

1. 拡張機能のオプション画面から、GitHub の Personal Access Token (PAT) を設定します。
2. 監視したいリポジトリをワークスペースとして登録します。
3. ポップアップまたはサイドパネルで、各ワークフローの稼働状況がリアルタイムに表示されます。

## プライバシーとセキュリティ

- **Local Only:** 本拡張機能は、GitHub API 以外への通信を一切行いません。
- **トラッキングなし:** アクセス解析や広告、外部サービスへのデータ送信は一切行いません。
- **透明性:** 外部ライブラリを一切使用しない Vanilla JS 構成。依存関係によるブラックボックスを排除しています。

## ディレクトリ構成

- `projects/app/`: 拡張機能の本体コード
- `docs/`: 要件定義・設計仕様書

## 免責事項

本ソフトウェアは、個人によって開発されたオープンソース・プロジェクトであり、**無保証 (AS IS)** です。
利用に際して生じたいかなる損害（データの消失、業務の中断等）について、開発者は一切の責任を負いません。自己責任でご利用ください。

## ライセンス

[MIT License](LICENSE)

---

© 2025 Masanori SATAKE
