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
  - <https://auth.maximum.vc/keygen> から生成できる
- Private Key (PRIVKEY)
  - Auth の Callback 認証で署名するための鍵
  - <https://auth.maximum.vc/keygen> から生成できる
  - Cloudflare には公開鍵 `eyJrdHkiOiJFQyIsImtleV9vcHMiOlsidmVyaWZ5Il0sImV4dCI6dHJ1ZSwiY3J2IjoiUC01MjEiLCJ4IjoiQUFUNVA4N3pCekFjdGcwakQ3NkNWbWNaX3NNS0hkWTJGeGZ2REwxMWxxR3hlTUZBd3REYnhpdTMwZUtkX2F3T3BjaG1relM3N2RkUmNLcEktSHdwQTQzciIsInkiOiJBTjRjcVljc0dsTDNXWTZUUXZRcklsMFExNVRDRzdTVkNVYk5kbURDUUg4dEhQZzZKTU9Cek55dFhLV1JUc3REd05qbVAzak12c3ZzdWdYelVBZ3kyNTRKIn0=` に対応する秘密鍵が保存されている
- Session Secret (SESSION_SECRET)
  - セッションの暗号化に使用するための文字列
  - `openssl rand -base64 32` で生成可能

### (ローカルのみ) Cloudflare 再現のための環境変数

- CF_PAGES_URL: `http://127.0.0.1:8788`
  - ローカルでの開発時に使用する URL
  - もしポート番号とかが異なる場合は適宜変更してください

## Worker

- Dev Mode (IS_DEV)
  - ローカルでの開発時に使用する
  - `true` にすると、ローカルでの開発モードになる
  - 本番環境では設定しないこと
- Private Key (PRIVKEY)
  - Auth で使用するための鍵
  - <https://auth.maximum.vc/keygen> から生成できる
  - Cloudflare には、公開鍵 `eyJrdHkiOiJFQyIsImtleV9vcHMiOlsidmVyaWZ5Il0sImV4dCI6dHJ1ZSwiY3J2IjoiUC01MjEiLCJ4IjoiQUxrNEJxbmpwY2d3UHo2QmdtdkJJVFBnTXlYbXJpbXlfUHJCTVl5dVNyTmQtWW9WdFRpWXozRVFYeWxPc2tXTnhmdUdvVFJqV3YzaXo2Q1NrUWFaRjI2SiIsInkiOiJBTzd0R0hKNUhkS0J6NzNfa3dRRm45d0hLQ1pLTmpnLTdhX29jNGV2VHhKaEZpdnNYc1B2cmlqZlBKazFLMzN6RldTUTVxb2t5ZXU4Y1lWb0dEUEhHWGdRIn0=` に対応する秘密鍵が保存されている
- Auth Domain (AUTH_DOMAIN)
  - ローカルで Auth Webapp を立ち上げる時に指定する
- Auth Public Key (AUTH_PUBKEY)
  - ローカルで Auth Webapp を立ち上げる時に指定する
  - `auth.maximum.vc` を使うときには ↑ に書いてある公開鍵を使う
