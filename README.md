# Auth

Maximum の統合認証プラットフォーム

## 方針

<https://www.figma.com/file/2KS1ZOo2rTe4SWwFppGKSo/Auth?type=whiteboard&t=47XNYGygOf1nXZip-6>

↑ Maximum の Figma「Auth」に概略を描いてあります。

## 使い方

> [!IMPORTANT]
> 以下のコードはちゃんと定まっているわけでもない、あくまで「構想段階」のコードです。
> まだ検証されていなければ、実装すらされていません。
> 本番環境では絶対に使わないでください。

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

必要な環境変数:

- `AUTH_NAME`: サービスの名前。 webapp に登録している名前を使う。
- `PRIVKEY`: 秘密鍵。 webapp に登録した公開鍵に対応するものを使う。

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

await checkLoggedIn(request, publicKey)  // => true/false
```

ユーザー情報の取得と合わせてログイン状態の確認を行うことも可能 (↓)

### ユーザー情報の取得

```javascript
import { getUserInfo } from '@saitamau-maximum/auth'

const options = {
  authName: "webapp に登録している名前",
  privateKey: "webapp に登録した公開鍵に対応する秘密鍵",
}

// ユーザー情報を取得
// isLoggedIn が false のとき、 userinfo は null
const [isLoggedIn, userinfo] = await getUserInfo(request, options)
```

### ログイン

サイトにアクセスしたらログインページにリダイレクトされる (...はず)

### ログアウト

`/auth/logout` にアクセスさせる。
