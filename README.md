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
> GitHub Packages でホストしているため、認証が必要。
> 詳しくは [公式ドキュメント](https://docs.github.com/ja/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-to-github-packages) を参照。

### 認証

#### Cloudflare Pages でホストしているサイト (pages.dev でアクセスできるサイト)

Cloudflare Pages Functions を使う。
ビルドで `functions/_middleware.js` (or `.ts`) として出力されるファイルに以下のコードを書く。

> [!TIP]
> 例えば Next.js や Remix なら `public/functions/_middleware.js` に書く。

```javascript
import { isAuthenticated, getLoginURL, getHeadersToSet } from '@saitamau-maximum/auth';

const authMiddleware = (context) => {
  // ヘッダを渡して認証する
  const isAuthenticated = await isAuthenticated(context.headers);

  // 認証されていない場合はリダイレクト
  if (!isAuthenticated) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: getLoginURL(),
      }
    })
  }

  // 認証以降の処理に進み、その応答を受け取る
  const response = await context.next();

  // 必要な応答ヘッダをセットする
  const headers = getHeadersToSet(context.headers);
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }

  return response;
};

// もしほかにも Middleware を使いたい場合
const myMiddleware = (context) => {
  // 何かしらの処理
  // ...
  return context.next();
};

export const onRequest = [authMiddleware, myMiddleware];
```

#### それ以外のサイト

Workers Routes を使って Reverse Proxy する。
Reverse Proxy でリクエストを受け付けたら、正しいリクエスト元かどうか検証する。
なお、ログインしていない場合には、 Proxy 側でリダイレクトされるので気にしなくていい。

```javascript
import { validateRequest } from '@saitamau-maximum/auth';

// 何らかの処理
// ...
const validation = validateRequest(request.headers);
if (!validation) {
  // 正しくないリクエスト
  return new Response(null, {
    status: 403,
  });
}
```

### ユーザー情報の取得

```javascript
import { getUserInfo } from '@saitamau-maximum/auth';

// ユーザー情報を取得
// 認証されていなければ null が返るので、これを実行する前に認証されているかチェックすべき
const user = getUserInfo(context.headers);
```

### ログアウト

```javascript
import { getLogoutURL } from '@saitamau-maximum/auth';

// この URL に 302 リダイレクトさせる
const logoutURL = getLogoutURL();
```
