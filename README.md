# ActionsBoard-Solo - GitHub Actions Real-time Monitor

[![version](https://img.shields.io/badge/version-1.1.4-blue)](projects/app/manifest.json)
[![Chrome Web Store Version](https://img.shields.io/badge/Chrome%20Web%20Store-v1.1.3-blue)](https://chromewebstore.google.com/detail/oofegjdjnldkikigimkadlleaiolionm)
[![License-MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Privacy-Local Only](https://img.shields.io/badge/Privacy-100%25%20Local-brightgreen)](#-privacy--security)
[![Manifest-V3](https://img.shields.io/badge/Manifest-V3-orange)](projects/app/manifest.json)

~ Streamline your CI/CD workflow monitoring with a smart, context-oriented, 100% local Chrome extension dashboard ~

## Overview

**ActionsBoard-Solo** is a privacy-first Chrome extension designed to monitor **GitHub Actions** workflows and GitHub Pages deployment statuses in real time.

Managing multiple repositories often leads to scattered build statuses and lost productivity during build wait times. ActionsBoard-Solo consolidates all your **ci-cd** pipelines into a unified **monitoring-dashboard**, tailored specifically to developer roles (Developer, Team Lead, Operations). Operating 100% locally without external servers, it directly interacts with the official GitHub API right from your browser.

For design philosophy and guidelines, please refer to [AGENTS.md](AGENTS.md).

## Key Features

- **Context-Oriented Monitoring Dashboard:** Seamlessly toggle between personal workflow activity (`My Activity`), workspace health, and batch operational monitoring.
- **Two-Stage Deployment & CI/CD Tracking:** Tracks both **github-actions** workflow completions and subsequent GitHub Pages deployments end-to-end.
- **Noiseless Build Failure Alerts:** Get notified immediately upon critical status changes and build failures, reducing cognitive overhead.
- **Adaptive Polling:** Automatically adjusts API polling frequency (30 seconds in foreground, reduced in background) to optimize rate limits.
- **Material Design 3 UI:** Built with a modern, intuitive, and responsive interface using Google Material 3 standards.
- **Essential DevOps Tools:** Designed for modern developer workflows without any external server dependency.

## Installation

### 🚀 Install from Chrome Web Store (Recommended)

[![Available in the Chrome Web Store](projects/web/assets/chrome-web-store-badge.png)](https://chromewebstore.google.com/detail/oofegjdjnldkikigimkadlleaiolionm)

### 🛠️ Install from Source Code

1. Clone or download this repository.
2. Open the extensions page in your browser (`chrome://extensions`).
3. Enable "Developer mode" in the top right.
4. Click "Load unpacked" and select the `projects/app` folder.

## How to Use

1. Open Extension Options and configure your GitHub Personal Access Token (PAT).
2. Register target repositories as Workspaces.
3. View real-time workflow statuses in the popup or side panel.

## 🔒 Privacy & Security

ActionsBoard-Solo is engineered with a strict **Privacy-First** architecture:

- **100% Local Execution:** Communicates exclusively with the GitHub API directly from your browser. No middleman servers, external proxies, or tracking services.
- **Zero Data Collection:** No telemetry, analytics, advertising trackers, or user data collection.
- **Pure Vanilla JS:** Built entirely with standard Web APIs and Vanilla JS without third-party runtime libraries, eliminating supply chain vulnerabilities and black-box dependencies.

## Directory Structure

- `projects/app/`: Core Chrome extension source code
- `docs/`: System design & specifications

## Disclaimer

This software is an open-source project created by an individual and is provided **"AS IS"** without any warranty of any kind.
The developer assumes no responsibility or liability for any damage, data loss, or business interruption resulting from the use of this software. Use at your own risk.

## License

[MIT License](LICENSE)

---

## 🇯🇵 日本語

### タイトル
`ActionsBoard-Solo - GitHub Actions の実行状況をリアルタイム監視`

### 概要
**ActionsBoard-Solo** は、全リポジトリの GitHub Actions ワークフローの成功・失敗ステータスを一覧ダッシュボード化し、CI/CD の失敗にいち早く気づいてビルド待ち時間を削減するローカル完結型 Chrome 拡張機能です。

開発者、チームリード、運用保守といったユーザーのコンテキストに合わせた視点で情報を集約。外部サーバーを介さず、ブラウザから直接 GitHub API を通信する安全な設計です。

### 主要機能
- **コンテキスト指向型ダッシュボード:** 自分自身のアクティビティ（My Activity）、ワークスペース全体の健全性、運用バッチ監視など目的別に切り替え可能。
- **2段階デプロイ追跡:** ワークフローの実行完了だけでなく、GitHub Pages への反映までを一気通貫で監視。
- **ノイズレス通知:** 自分に関連するビルド失敗などの重要な状態変化のみを通知。
- **完全ローカル＆プライバシー重視:** 外部サーバー通信・データ収集・外部依存ライブラリを一切使用しない Pure Vanilla JS 構成。

---

© 2026 Masanori SATAKE
