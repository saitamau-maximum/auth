import { importKey } from '@saitamau-maximum/auth/internal'
import { and, eq, inArray } from 'drizzle-orm'
import { Context, Hono } from 'hono'
import { html } from 'hono/html'
import { validator } from 'hono/validator'
import { HonoEnv } from 'load-context'
import { generateAuthToken } from 'utils/auth-token.server'

import {
  oauthClient,
  oauthClientScope,
  oauthScope,
  user,
} from '../../app/schema'

const app = new Hono<HonoEnv>()

// 仕様はここ参照: https://github.com/saitamau-maximum/auth/issues/27

app.get(
  '/',
  // Zod だといい感じのエラーメッセージ書くのが面倒くさいので、手動で書いてる
  // TODO: Bad Request の画面をいい感じにするかも
  validator('query', async (query, c: Context<HonoEnv>) => {
    // client_id が存在するかチェック
    const clientId = query['client_id']
    if (!clientId || Array.isArray(clientId)) {
      return c.text('Bad Request: invalid client_id', 400)
    }

    // client_id が DB にあるかチェック
    const client = (
      await c.var.db_client
        .select()
        .from(oauthClient)
        .leftJoin(user, eq(oauthClient.owner_id, user.id))
        .where(eq(oauthClient.id, clientId))
        .limit(1)
    )[0]
    // LIMIT 1 なので client.length は 0 or 1 で、条件に合致するものがなかったら [0] が undefined になる
    if (!client) {
      return c.text('Bad Request: client_id not registered', 400)
    }

    // redirect_uri が複数ないことをチェック
    let redirectUri = query['redirect_uri']
    if (Array.isArray(redirectUri) && redirectUri.length > 1) {
      return c.text('Bad Request: too many redirect_uri', 400)
    }

    // redirect_uri がパラメータとして与えられていない場合
    if (!redirectUri || Array.isArray(redirectUri)) {
      const registeredUris =
        await c.var.db_client.query.oauthClientCallback.findMany({
          where: (oauthClientCallback, { eq }) =>
            eq(oauthClientCallback.client_id, clientId),
        })

      if (registeredUris.length === 0) {
        return c.text('Bad Request: redirect_uri not registered', 400)
      }
      if (registeredUris.length > 1) {
        return c.text('Bad Request: ambiguous redirect_uri', 400)
      }

      // DB 内に登録されているものを callback として扱う
      redirectUri = registeredUris[0].callback_url
    } else {
      if (!URL.canParse(redirectUri)) {
        return c.text('Bad Request: invalid redirect_uri', 400)
      }

      // Redirect URI のクエリパラメータ部分は変わることを許容する
      const normalizedUri = new URL(redirectUri)
      normalizedUri.search = ''

      const registeredUri =
        await c.var.db_client.query.oauthClientCallback.findFirst({
          where: (oauthClientCallback, { eq, and }) =>
            and(
              eq(oauthClientCallback.client_id, clientId),
              eq(oauthClientCallback.callback_url, normalizedUri.toString()),
            ),
        })

      if (!registeredUri) {
        return c.text('Bad Request: redirect_uri not registered', 400)
      }
    }

    let state = query['state']
    if (!state || Array.isArray(state)) {
      if (Array.isArray(state) && state.length > 1) {
        return c.text('Bad Request: too many state')
      }
      state = ''
    }

    // ---------- 以下エラー時リダイレクトさせるやつ ---------- //

    const errorRedirect = (
      error: string,
      description: string,
      _errorUri: string,
    ) => {
      const callback = new URL(redirectUri)

      callback.searchParams.append('error', error)
      callback.searchParams.append('error_description', description)
      // callback.searchParams.append("error_uri", "") // そのうち書きたいね
      if (state) callback.searchParams.append('state', state)

      return c.redirect(callback.toString(), 302)
    }

    const responseType = query['response_type']
    if (!responseType || Array.isArray(responseType)) {
      return errorRedirect('invalid_request', 'response_type required', '')
    }
    if (responseType !== 'code') {
      return errorRedirect(
        'unsupported_response_type',
        "only 'code' is supported",
        '',
      )
    }

    let scope = query['scope']
    let dbScopes: {
      oauth_scope: {
        id: number
        name: string
        description: string | null
      } | null
      oauth_client_scope: {
        client_id: string
        scope_id: number
      }
    }[]

    if (!scope || Array.isArray(scope)) {
      // TODO: error_uri に Hint: scope must be separated with space みたいなことを書いてあげるといいのかな
      if (Array.isArray(scope) && scope.length > 1) {
        return errorRedirect('invalid_request', 'too many scope parameter', '')
      }
      scope = ''
      dbScopes = await c.var.db_client
        .select()
        .from(oauthClientScope)
        .leftJoin(oauthScope, eq(oauthClientScope.scope_id, oauthScope.id))
        .where(eq(oauthClientScope.client_id, clientId))
    } else {
      const scopeRegex =
        /^[\x21|\x23-\x5B|\x5D-\x7E]+(?:\x20+[\x21|\x23-\x5B|\x5D-\x7E]+)*$/
      if (!scopeRegex.test(scope)) {
        return errorRedirect('invalid_scope', 'invalid scope format', '')
      }

      const scopes = scope.split(' ')
      const uniqueScopes = [...new Set(scope.split(' '))]
      if (scopes.length !== uniqueScopes.length) {
        return errorRedirect(
          'invalid_scope',
          'there are duplicates in scopes',
          '',
        )
      }

      dbScopes = await c.var.db_client
        .select()
        .from(oauthClientScope)
        .leftJoin(oauthScope, eq(oauthClientScope.scope_id, oauthScope.id))
        .where(
          and(
            eq(oauthClientScope.client_id, clientId),
            inArray(oauthScope.name, scopes),
          ),
        )
      const dbScopesSet = new Set(
        dbScopes.map(scope => scope.oauth_scope?.name),
      )
      const unknownScopes = scopes.filter(scope => !dbScopesSet.has(scope))
      if (unknownScopes.length > 0) {
        return errorRedirect(
          'invalid_scope',
          `unknown scope: ${unknownScopes.join(', ')}`,
          '',
        )
      }
    }

    if (dbScopes.length === 0) {
      return errorRedirect(
        'invalid_scope',
        'there must be at least one scope specified',
        '',
      )
    }

    return { clientId, redirectUri, state, scope, dbScopes, clientInfo: client }
  }),
  async (c, next) => {
    // TODO: ログインしているかチェック
    return next()
  },
  async c => {
    const { clientId, redirectUri, state, scope, dbScopes, clientInfo } =
      c.req.valid('query')
    const nowUnixMs = Date.now()

    const privateKey = await importKey(c.env.PRIVKEY, 'privateKey')
    const token = await generateAuthToken({
      clientId,
      redirectUri,
      scope,
      state,
      time: nowUnixMs,
      key: privateKey,
    })

    // TODO: デザインちゃんとする
    // とりあえず GitHub OAuth のイメージで書いてる
    const responseHtml = html`<!doctype html>
      <html lang="ja">
        <head>
          <title>
            Authorize ${clientInfo.oauth_client.name} | Maximum Auth
          </title>
        </head>
        <body>
          <h1>${clientInfo.oauth_client.name} を承認しますか？</h1>
          <div>
            承認すると、 ${clientInfo.user?.displayName} による
            ${clientInfo.oauth_client.name} はあなたのアカウント
            (ここにログインユーザーの情報を入れる)
            の以下の情報にアクセスできるようになります。
            <ul>
              ${dbScopes.map(
                data =>
                  html`<li>
                    ${data.oauth_scope?.name}: ${data.oauth_scope?.description}
                  </li>`,
              )}
            </ul>
          </div>
          <form method="POST" action="/oauth/callback">
            <input type="hidden" name="client_id" value="${clientId}" />
            <input type="hidden" name="redirect_uri" value="${redirectUri}" />
            <input type="hidden" name="state" value="${state}" />
            <input type="hidden" name="scope" value="${scope}" />
            <input type="hidden" name="time" value="${nowUnixMs}" />
            <input type="hidden" name="auth_token" value="${token}" />
            <button type="submit" name="authorized" value="1">承認する</button>
            <button type="submit" name="authorized" value="0">拒否する</button>
            ${new URL(redirectUri).origin} にリダイレクトします。
            このアドレスが意図しているものか確認してください。
          </form>
        </body>
      </html> `

    c.header('Cache-Control', 'no-store')
    c.header('Pragma', 'no-cache')
    return c.html(responseHtml)
  },
)

// OAuth 仕様としては POST も Optional で許容してもよい
// 必要なら対応させるかもしれないが、今のところまあいらんやろ
app.all('/', async c => {
  return c.text('method not allowed', 405)
})

export default app
