# Auth

Maximum の統合認証プラットフォーム

## 方針

<https://www.figma.com/file/2KS1ZOo2rTe4SWwFppGKSo/Auth?type=whiteboard&t=47XNYGygOf1nXZip-6>

↑ Maximum の Figma「Auth」に概略を描いてあります。

## 開発手順

[development.md](./development.md) を参照。
利用方法は以下を参照。

## 使い方

### 共通

`@saitamau-maximum/auth` をインストール。

> [!NOTE]
> GitHub Packages でホストしているため、インストール時には認証が必要。
> 詳しくは [公式ドキュメント](https://docs.github.com/ja/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-to-github-packages) を参照。

基本的な使い方を書きます。
Auth 開発時には別オプションを指定できますが、詳しくは実装を見てください。

### 認証

> [!WARNING]
> `/auth` 以下のパスは使えなくなります。ご注意ください。

#### Cloudflare Pages でホストしているサイト (pages.dev でアクセスできるサイト)

Cloudflare Pages Functions を使う。
ビルドで `functions/_middleware.js` (or `.ts`) として出力されるファイルに以下のコードを書く。

> [!TIP]
> 例えば Next.js や Remix なら `functions/_middleware.js` に書く。

なお、 export されている `middleware` は Cloudflare Workers, Cloudflare Pages Function (or それらと互換性のあるもの) で使うことを想定しています。
それ以外の環境では使えない可能性があります。

```javascript
import { middleware as authMiddleware } from '@saitamau-maximum/auth'

// もしほかにも Middleware を使いたい場合
const myMiddleware = context => {
  // 何かしらの処理
  // ...
  return context.next()
}

export const onRequest = [authMiddleware, myMiddleware]
```

##### ローカルでの開発

実際には Auth にアクセスせずにローカルのみで動作する、開発用モードがあります。
環境変数に `IS_DEV=true` を設定すると有効になります。
**この環境変数はデプロイ時には設定しないでください**。一応内部的にチェックしますが、念のため。

##### デプロイ時の設定

まず、認証に必要な鍵ペアを用意します。
<https://auth.maximum.vc/keygen> から生成できます。
一緒に表示されている秘密鍵 (Private Key) と公開鍵 (Public Key) をメモしてください。
(対称鍵 Symmetric Key は使いません)

生成したら、公開鍵を `webapp` に登録します。
saitamau-maximum/auth の [webapp/data/pubkey.json](https://github.com/saitamau-maximum/auth/blob/main/webapp/data/pubkey.json) に、ホストするサービス名と公開鍵を追加して、 PR を出してください。
(何か間違っていれば Actions が落ちて教えてくれます)

```json
[
  ...,
  {
    "name": "サービスの名前",
    "pubkey": "公開鍵"
  }
]
```

次に、環境変数を設定します。

- `AUTH_NAME`: サービスの名前
- `PRIVKEY`: 秘密鍵。登録した公開鍵に対応するものを使う。必ず Encrypt して保存してください。

これでデプロイすれば認証されるようになります。

#### それ以外のサイト

Workers Routes を使って Reverse Proxy する。
Reverse Proxy でリクエストを受け付けたら、正しいリクエスト元かどうか検証する。
なお、ログインしていない場合には、 Proxy 側でリダイレクトされるので気にしなくていい。

```javascript
import { validateRequest } from '@saitamau-maximum/auth'

// 何らかの処理
// ...
const validation = validateRequest(request.headers)
if (!validation) {
  // 正しくないリクエスト
  return new Response(null, {
    status: 403,
  })
}
```

JS/TS 以外の言語を使いたい場合、 `package/src/validate.ts` を参考にしてください。

### ログイン状態の確認

```javascript
import { checkLoggedIn } from '@saitamau-maximum/auth'

await checkLoggedIn(request, publicKey) // => true/false
```

ユーザー情報の取得と合わせてログイン状態の確認を行うことも可能 (↓)

### ユーザー情報の取得

```javascript
import { getUserInfo } from '@saitamau-maximum/auth'

const options = {
  authName: 'webapp に登録している名前',
  privateKey: 'webapp に登録した公開鍵に対応する秘密鍵',
}

// ユーザー情報を取得
// ログインしていないとき、 userinfo は null になる
const userinfo = await getUserInfo(request, options)
```

> [!WARNING]
> `@saitamau-maximum/auth`を使う場合は必ずサーバーサイドで行ってください。
> 秘匿情報は必ずクライアント側へ露出しないよう、細心の注意を払ってください。

クライアントサイドで取得する場合

```javascript
import { getUserInfo_client } from '@saitamau-maximum/auth'

const userinfo = await getUserInfo_client()
```

### ログイン

サイトにアクセスしたらログインページにリダイレクトされる (...はず)

### ログアウト

`/auth/logout` にアクセスさせる。
