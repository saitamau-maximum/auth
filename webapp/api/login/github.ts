import { zValidator } from '@hono/zod-validator'
import { createAppAuth } from '@octokit/auth-app'
import { Hono } from 'hono'
import { HonoEnv } from 'load-context'
import { Octokit } from 'octokit'
import { binaryToBase64 } from 'utils/convert-bin-base64'
import cookieSessionStorage from 'utils/session.server'
import { z } from 'zod'

const app = new Hono<HonoEnv>()

app.get('/', async c => {
  const state = binaryToBase64(crypto.getRandomValues(new Uint8Array(30)))

  const { getSession, commitSession } = cookieSessionStorage(c.env)
  const session = await getSession(c.req.raw.headers.get('Cookie'))
  session.flash('state', state)
  c.header('Set-Cookie', await commitSession(session))

  // ref: https://docs.github.com/ja/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
  const oauthUrl = new URL('https://github.com/login/oauth/authorize')
  const oauthParams = new URLSearchParams()
  oauthParams.set('client_id', c.env.GITHUB_OAUTH_ID)
  oauthParams.set('redirect_uri', `${c.env.CF_PAGES_URL}/login/github/callback`)
  oauthParams.set('scope', 'read:user')
  oauthParams.set('state', state)
  oauthParams.set('allow_signup', 'false')

  return c.redirect(oauthUrl.toString() + '?' + oauthParams.toString(), 302)
})

app.all('/', async c => {
  return c.text('method not allowed', 405)
})

interface GitHubOAuthTokenResponse {
  access_token: string
  scope: string
  token_type: string
}

// TODO: cookieSessionStorage の userId 以外は使ってないので消す
app.get(
  '/callback',
  zValidator('query', z.object({ code: z.string(), state: z.string() })),
  async c => {
    const { code, state } = c.req.valid('query')

    const { getSession, commitSession } = cookieSessionStorage(c.env)
    const session = await getSession(c.req.raw.headers.get('Cookie'))

    if (state !== session.get('state')) {
      c.header('Set-Cookie', await commitSession(session))
      return c.text('state mismatch', 400)
    }

    const continueTo = session.get('continue_to')
    if (!continueTo) {
      c.header('Set-Cookie', await commitSession(session))
      return c.text('continue_to not found', 400)
    }

    const { access_token } = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: c.env.GITHUB_OAUTH_ID,
          client_secret: c.env.GITHUB_OAUTH_SECRET,
          code,
        }),
      },
    )
      .then(res => res.json<GitHubOAuthTokenResponse>())
      .catch(() => ({ access_token: null }))

    if (!access_token) {
      return c.text('invalid code', 400)
    }

    // ----- メンバーの所属判定 ----- //
    const userOctokit = new Octokit({ auth: access_token })
    const appOctokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: c.env.GITHUB_APP_ID,
        privateKey: atob(c.env.GITHUB_APP_PRIVKEY),
        installationId: '41674415',
      },
    })

    const { data: user } = await userOctokit.request('GET /user')

    let isMember = false
    try {
      const checkIsOrgMemberRes = await appOctokit.request(
        'GET /orgs/{org}/members/{username}',
        {
          org: 'saitamau-maximum',
          username: user.login,
        },
      )
      isMember = (checkIsOrgMemberRes.status as number) === 204
    } catch {
      isMember = false
    }

    if (!isMember) {
      // いったん member じゃない場合はログインさせないようにする
      // TODO: IdP が出来たらこっちも対応できるようにする
      c.header('Set-Cookie', await commitSession(session))
      return c.text('not a member', 403)
    }

    // すでになければ DB にユーザー情報を格納
    const oauthConnInfo = await c.var.idpClient.getUserIdByOauthId(
      1,
      String(user.id),
    )
    if (!oauthConnInfo) {
      const uuid = crypto.randomUUID().replaceAll('-', '')
      // とりあえず仮情報で埋める
      await c.var.idpClient.createUserWithOauth(
        {
          id: uuid,
          display_name: user.login,
          profile_image_url: user.avatar_url,
        },
        {
          user_id: uuid,
          provider_id: 1,
          provider_user_id: String(user.id),
          email: user.email,
          name: user.login,
          profile_image_url: user.avatar_url,
        },
      )
      session.set('user_id', uuid)
    } else {
      session.set('user_id', oauthConnInfo.user_id)
    }

    c.header('Set-Cookie', await commitSession(session))
    return c.redirect(continueTo, 302)
  },
)

app.all('/callback', async c => {
  return c.text('method not allowed', 405)
})

export default app
