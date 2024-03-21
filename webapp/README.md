# Webapp

<https://auth.maximum.vc/>

ローカルで検証したい場合は `.dev.vars` と `webapp/data/pubkey.json` に適当な情報を書いてください (コミットせずに)

## Routes

- `/`: Auth としては使ってないただの説明ページ
- `/go`: Webapp で認証させる受取先
- `/continue`: ログイン後のリダイレクト先
- `/keygen`: 鍵生成
- `/cb`: GitHub OAuth の Callback
- `/token`: トークン生成 API
- `/user`: ユーザー情報取得 API

フローは Figma 参照。
