# 各種認証情報のメモ

そのうちどれを消していいのかわからなくなりそうなので

**重要: ここに書いてある情報は Cloudflare 上で暗号化すべき + ここに認証情報そのものは載せない**

形式: `情報 (環境変数名): 値 + 備考`

## Webapp

### GitHub との連携に使用するための情報

<https://github.com/organizations/saitamau-maximum/settings/apps/maximum-auth> からチェック。

- GitHub App ID (GITHUB_APP_ID)
  - 画面上部の `App ID` に書いてある 6 桁の数字
- GitHub Private Key (GITHUB_APP_PRIVKEY)
  - Private Key を発行し、ダウンロードしたファイルを `INPUT_FILE` として、以下のコマンドを実行して変換したもの
  - `openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in INPUT_FILE | openssl base64 -A`
  - Cloudflare には `SHA256:wowbG0gmps60OuYv+g7hCqxUN6cBA7RFWmR/VH4tShI=` が保存されている
- Client ID (GITHUB_OAUTH_ID)
  - 画面上部に書かれている `Client ID`
- Client Secret (GITHUB_OAUTH_SECRET)
  - Client secrets から発行したもの
  - Cloudflare には `*****ba34a5be` が保存されている

### Auth で使用する情報

- Symmetric Key (SYMKEY)
  - 値を暗号化して保存するための鍵
  - <https://auth.maximum.vc/util/keygen> から生成できる (予定)
- Session Secret (SESSION_SECRET)
  - セッションの暗号化に使用するための文字列
  - `openssl rand -base64 32` で生成可能

### (ローカルのみ) Cloudflare 再現のための環境変数

- CF_PAGES_URL: `http://127.0.0.1:8788`
  - ローカルでの開発時に使用する URL
  - もしポート番号とかが異なる場合は適宜変更してください

## Worker

### Auth で使用する情報

- Private Key (PRIVKEY)
  - Auth で使用するための鍵
  - <https://auth.maximum.vc/util/keygen> から生成できる (予定)
  - 公開鍵は `webapp/data/pubkey.json` に書いて PR 出してください (予定)
  - ローカル開発時には以下の情報を使用してください: `(TODO: 書く)`
