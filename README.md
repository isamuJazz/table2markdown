# devcontainer-foundation

## 目的

汎用的にaiコーディングを行える.devcontainer環境を作成しています。  

## セキュリティ  

claude code などで、自動認可で実行させることを想定し、iptablesによりファイアウォール設定を行っています。devcontainer立ち上げ後はたとえroot, sudo を使ってもネットワーク設定を変更できません。  

## 使い方

### 初期プロジェクトの場合  

devcontainerを利用したいプロジェクトにmainブランチをクローンしてください。その後、.gitを削除してください。  

### 既存プロジェクトの場合

プロジェクトとは別の場所でクローンし、.gitを削除後、.devcontainerをフォルダごと移動してください。  