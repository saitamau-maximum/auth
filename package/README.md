# @saitamau-maximum/auth

使い方は [auth リポジトリトップの README.md](https://github.com/saitamau-maximum/auth/blob/main/README.md) を参照。

## ファイルの説明とか

- `index.ts`: こいつら全部 export マン
  - 一応 `export * from "..."` みたいな書き方はしてない

### webapp とのブリッジ

- `goparam.ts`: webapp の `/go` に送信するクエリパラメータの生成とその検証
- `keygen.ts`: 鍵生成のユーティリティ
- `tokengen.ts`: webapp に送信するトークン生成と検証

### ライブラリのメイン部分

- `middleware.ts`: Cloudflare Workers で使うためのミドルウェア
- `getUserInfo.ts`: Cookie からユーザー情報を読み出す
- `validate.ts`: Proxy からのリクエストかどうかを検証する

## テスト

`pnpm test`

Coverage を 100% にするようにしてはいるが、コードが正しいことは保証しない。
