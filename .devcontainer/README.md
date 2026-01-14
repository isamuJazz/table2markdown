# d2-strategy-devcontainer-foundation

このプロジェクトは、セキュアな開発環境を提供する `.devcontainer` 設定のテンプレートです。

## 概要

このリポジトリの `.devcontainer` フォルダを他のプロジェクトにコピーして使用することで、統一されたセキュアな開発環境を構築できます。

## 主な機能

### 🔒 ネットワークファイアウォール

- **iptables による厳格なアクセス制御**
  - 許可されたドメイン・IPアドレスのみアクセス可能
  - GitHub、npm、PyPI、Docker Hub、VS Code拡張機能など開発に必要なサービスを許可
  - 許可されていない外部サイト（例: Yahoo、Amazon等）へのアクセスをブロック

- **ファイアウォール設定の保護**
  - コンテナ起動時に自動的にファイアウォールを設定（`init-firewall.sh`）
  - 起動後は `vscode` ユーザーが `iptables`、`ip6tables`、`ipset` を変更できないよう制限
  - `sudo` を使用してもファイアウォール関連コマンドは実行不可

### 🛠️ 開発ツール

- **Node.js**: Volta 経由でインストール (デフォルト: v22)
- **Python**: uv 経由でインストール (デフォルト: v3.12)
- **Git / GitHub CLI**: 標準搭載
- **Docker-in-Docker**: コンテナ内でDockerを使用可能

### 📦 VS Code 拡張機能

- Git 関連: Git History, GitLens, Git Graph
- Docker サポート
- Python サポート
- PostgreSQL サポート
- Markdown Preview Enhanced
- 日本語言語パック

## 使い方

### 1. `.devcontainer` フォルダをコピー

このリポジトリの `.devcontainer` フォルダを、あなたのプロジェクトのルートにコピーしてください。

```bash
# 例: 新しいプロジェクトに追加する場合
cp -r /path/to/d2-strategy-devcontainer-foundation/.devcontainer /path/to/your-project/
```

そのあと、devcontainer.jsonのnameを変更し、compose.yamlの、container-nameを自身の他のコンテナ名で使っていないものに修正してください。  

### 2. VS Code で開く

VS Code でプロジェクトを開き、「Reopen in Container」を実行します。

### 3. 必要に応じてカスタマイズ

#### Node.js / Python バージョンの変更

`.devcontainer/Dockerfile` の `ARG` を編集:

```dockerfile
ARG NODE_VERSION=22
ARG PYTHON_VERSION=3.12
```

#### 許可ドメインの追加

`.devcontainer/init-firewall.sh` のドメインリストに追加:

```bash
for domain in \
    "registry.npmjs.org" \
    "your-domain.com" \    # ← 追加
    ...
```

## ファイル構成

```
.devcontainer/
├── devcontainer.json          # Dev Container設定
├── compose.yaml               # Docker Compose設定
├── Dockerfile                 # コンテナイメージ定義
├── init-firewall.sh           # ファイアウォール初期化スクリプト
└── revoke-firewall-sudo.sh    # sudo権限取り消しスクリプト（予備）
```

## セキュリティ機能の詳細

### アクセス制御の仕組み

1. **コンテナ起動時** (`postStartCommand`)
   - `init-firewall.sh` が `root` 権限で実行される
   - 許可されたドメインのIPアドレスを取得し、ipsetに登録
   - iptablesでデフォルトポリシーを `DROP` に設定
   - ipsetに登録されたIPアドレスのみ通信を許可

2. **起動完了後**
   - `/etc/sudoers.d/vscode` を書き換えてファイアウォール関連コマンドを禁止
   - `vscode` ユーザーはファイアウォール設定を変更不可

### 確認方法

```bash
# ファイアウォールルールの確認（読み取りのみ、変更不可）
sudo iptables -L  # → エラー: not allowed to execute

# 許可されたドメインへのアクセス（成功）
curl https://api.github.com

# 許可されていないドメインへのアクセス（失敗）
curl https://www.yahoo.co.jp  # → タイムアウト
```

## ライセンス

（必要に応じて記載）

## 貢献

（必要に応じて記載）
