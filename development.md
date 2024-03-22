# 開発手順

## 共通

- `pnpm install` して依存関係をインストールする

## `/package` の開発

- `pnpm build` でビルド
- `pnpm test` をしながら開発する
- 実際にどう動くかの確認は `/webapp`, `/worker` が必要になるので、以下を参照

## `/worker` の開発

1. まず `/package` をビルドする (`cd package && pnpm build`)
2. `/worker/.dev.vars.sample` をコピーして `/worker/.dev.vars` を作成する
3. `/worker/.dev.vars` を編集する。
   詳しくは [cred-memo.md](./cred-memo.md) を参照。
   `IS_DEV=true` を設定することで、 Webapp には依存しない、ローカルでの開発モードになる。
   このとき、 `AUTH_DOMAIN`, `AUTH_PUBKEY`, `PRIVKEY` は適当な値で OK (入力は必要)。
4. `pnpm dev` で Worker を立ち上げる

## `/webapp` の開発

Webapp のローカル動作確認をするためには何らかの方法で認証サービスからアクセスする必要があるので、 Worker を設定しておくこと (以下参照)。

1. まず `/package` をビルドする (`cd package && pnpm build`)
2. `/webapp/.dev.vars.sample` をコピーして `/webapp/.dev.vars` を作成する
3. `/webapp/.dev.vars` を編集する。詳しくは [cred-memo.md](./cred-memo.md) を参照。
4. Worker の設定 1-5 をする。ただし `IS_DEV` は設定しない。
   3 で設定した秘密鍵に対応する公開鍵を `AUTH_PUBKEY` に設定する。
   また、 Worker の `AUTH_DOMAIN` には Webapp で設定した `CF_PAGES_URL` を設定する。
5. Worker の環境変数に指定した秘密鍵に対応する公開鍵を `/webapp/data/pubkey.json` に追加する。
6. Webapp を立ち上げる (`pnpm dev`)
7. 立ち上げた際、もし環境変数で設定した URL と異なる場合には、それに合わせて変更する。変更したらもう一度立ち上げなおす。
8. Worker を立ち上げる
