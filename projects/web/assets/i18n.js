const i18n = {
  ja: {
    title: 'ActionsBoard-Solo - GitHub Actions ダッシュボード',
    subtitle: '自分専用の視点で GitHub Actions をスマートに監視',
    about_title: 'プロジェクト概要',
    about_p1:
      'ActionsBoard-Solo は、GitHub Actions の実行状態と GitHub Pages のデプロイステータスをリアルタイムで追跡し、開発者の「待ち時間」を最小化するための Chrome 拡張機能です。',
    about_p2:
      '複数リポジトリを跨ぐプロジェクトにおいて、情報が分散しがちな GitHub Actions の状態を、ユーザーの役割（開発者、チームリード、運用保守）に合わせた「コンテキスト指向」の視点で集約します。',
    features_title: '主な特徴',
    feature1_title: 'コンテキスト指向型',
    feature1_p:
      '自分のアクティビティ、チーム全体の健全性、運用監視など、目的に合わせた表示モードの切り替えが可能です。',
    feature2_title: '2段階デプロイ追跡',
    feature2_p:
      'Actions の完了だけでなく、その後の GitHub Pages への反映（デプロイ完了）までを一気通貫で監視します。',
    feature3_title: '完全ローカル・プライバシー',
    feature3_p:
      'GitHub PATや設定データはすべてブラウザ内に保存。外部サーバーへの送信は一切行いません。',
    feature4_title: 'アダプティブ・ポーリング',
    feature4_p: '利用状況に応じて API 通信頻度を最適化。通知も最小限の認知負荷で受け取れます。',
    cta_title: '今すぐ始めましょう',
    cta_p: 'Chrome ウェブストアから無料でインストールできます。',
    links_title: 'リンク',
    link_usage: '使いかたガイド',
    link_privacy: 'プライバシーポリシー',
    link_repo: 'GitHub リポジトリ',
    nav_home: 'ホーム',
    nav_usage: '使いかた',
    nav_privacy: 'プライバシー',
    privacy_title: 'プライバシーポリシー',
    privacy_intro:
      'ActionsBoard-Solo（以下「本拡張機能」）は、ユーザーのプライバシーを最優先に設計されています。',
    privacy_h1: '1. データの収集と利用',
    privacy_p1:
      '本拡張機能は、GitHub API を使用してワークフローの実行状態を取得しますが、取得したデータやユーザーが設定したアクセストークン（PAT）を外部のサーバーに送信することはありません。すべてのデータはユーザーのブラウザ内（chrome.storage.local）でのみ保存・利用されます。',
    privacy_h2: '2. 外部通信について',
    privacy_p2:
      '本拡張機能は、GitHub API（api.github.com または指定された GHE インスタンス）以外との通信を行いません。アクセス解析や広告、クラッシュレポート送信などの外部通信も一切含まれていません。',
    privacy_h3: '3. 権限の利用について',
    privacy_p3:
      '本拡張機能は、GitHub API へのアクセスおよびバックグラウンドでのポーリング、通知の表示のために必要な権限のみを要求します。',
    privacy_h4: '4. 免責事項',
    privacy_p4:
      '本拡張機能の利用により生じたいかなる損害についても、開発者は一切の責任を負いません。自己責任でご利用ください。',
    back_home: 'ホームに戻る',
    usage_title: 'ActionsBoard-Solo の使いかた',
    usage_step1_t: '1. アカウントの設定',
    usage_step1_p:
      '拡張機能のオプション画面から、GitHub の Personal Access Token (PAT) を登録します。リポジトリの読み取り権限が必要です。',
    usage_step2_t: '2. ワークスペースの追加',
    usage_step2_p:
      '監視したいリポジトリをワークスペースとして登録します。リポジトリURLを貼り付けるだけで、ワークフローを自動検出します。',
    usage_step3_t: '3. ダッシュボードの利用',
    usage_step3_p:
      'サイドパネルまたはポップアップで、各ワークフローの稼働状況を確認できます。必要に応じて「お気に入り」登録も可能です。',
    usage_step4_t: '4. モードの切り替え',
    usage_step4_p:
      '「My Activity」「ワークスペース」「運用保守」の3つのモードを切り替えて、目的に最適な情報を表示します。',
  },
  en: {
    title: 'ActionsBoard-Solo - GitHub Actions Dashboard',
    subtitle: 'Smart monitoring of GitHub Actions from your own perspective',
    about_title: 'Project Overview',
    about_p1:
      "ActionsBoard-Solo is a Chrome extension that tracks the execution status of GitHub Actions and GitHub Pages deployment status in real-time, minimizing 'wait time' for developers.",
    about_p2:
      "It aggregates information from multiple repositories in a 'context-oriented' view tailored to the user's role (Developer, Team Lead, Operations).",
    features_title: 'Key Features',
    feature1_title: 'Context-Oriented',
    feature1_p:
      'Switch between display modes based on your needs, such as My Activity, Team Health, or Operations Monitoring.',
    feature2_title: 'Two-Stage Deployment Tracking',
    feature2_p:
      'Monitors everything from Actions completion to the subsequent GitHub Pages reflection (deployment complete).',
    feature3_title: 'Fully Local & Private',
    feature3_p:
      'GitHub PATs and configuration data are stored within the browser. No data is ever sent to external servers.',
    feature4_title: 'Adaptive Polling',
    feature4_p:
      'Optimizes API communication frequency based on usage. Receive notifications with minimal cognitive load.',
    cta_title: 'Get Started Now',
    cta_p: 'Available for free on the Chrome Web Store.',
    links_title: 'Links',
    link_usage: 'Usage Guide',
    link_privacy: 'Privacy Policy',
    link_repo: 'GitHub Repository',
    nav_home: 'Home',
    nav_usage: 'Usage',
    nav_privacy: 'Privacy',
    privacy_title: 'Privacy Policy',
    privacy_intro:
      'ActionsBoard-Solo (hereinafter referred to as "this extension") is designed with user privacy as the top priority.',
    privacy_h1: '1. Data Collection and Use',
    privacy_p1:
      "This extension uses the GitHub API to fetch workflow status. However, it does not send the fetched data or user-configured Personal Access Tokens (PAT) to any external servers. All data is stored and used only within the user's browser (chrome.storage.local).",
    privacy_h2: '2. External Communication',
    privacy_p2:
      'This extension does not communicate with anything other than the GitHub API (api.github.com or specified GHE instances). It does not include any external communication such as analytics, ad networks, or crash report transmissions.',
    privacy_h3: '3. Use of Permissions',
    privacy_p3:
      'This extension only requests the permissions necessary for GitHub API access, background polling, and displaying notifications.',
    privacy_h4: '4. Disclaimer',
    privacy_p4:
      'The developer shall not be liable for any damages arising from the use of this extension. Use at your own risk.',
    back_home: 'Back to Home',
    usage_title: 'How to Use ActionsBoard-Solo',
    usage_step1_t: '1. Account Configuration',
    usage_step1_p:
      "Register your GitHub Personal Access Token (PAT) from the extension's options page. Repository read access is required.",
    usage_step2_t: '2. Adding Workspaces',
    usage_step2_p:
      'Register repositories you want to monitor as workspaces. Simply paste the repository URL to automatically detect workflows.',
    usage_step3_t: '3. Using the Dashboard',
    usage_step3_p:
      "Check the status of each workflow in the side panel or popup. You can also 'Favorite' important workflows.",
    usage_step4_t: '4. Switching Modes',
    usage_step4_p:
      "Switch between 'My Activity', 'Workspace', and 'Operations' modes to display information best suited for your purpose.",
  },
};

function updateContent() {
  const lang = navigator.language.startsWith('ja') ? 'ja' : 'en';
  const texts = i18n[lang];

  document.title = texts.title;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (texts[key]) {
      el.textContent = texts[key];
    }
  });
}

document.addEventListener('DOMContentLoaded', updateContent);
