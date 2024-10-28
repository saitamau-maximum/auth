import { zValidator } from '@hono/zod-validator'
import { createAppAuth } from '@octokit/auth-app'
import { Hono } from 'hono'
import { Octokit } from 'octokit'
import cookieSessionStorage from 'utils/session.server'
import { z } from 'zod'

import { Env } from '../load-context'

const app = new Hono<{ Bindings: Env }>()

interface GitHubOAuthTokenResponse {
  access_token: string
  scope: string
  token_type: string
}

app.get(
  '/',
  zValidator('query', z.object({ code: z.string(), state: z.string() })),
  async c => {
    const { code, state } = c.req.valid('query')

    const { getSession, commitSession } = cookieSessionStorage(c.env)
    const session = await getSession(c.req.header('Cookie'))

    if (state !== session.get('state')) {
      c.header('Set-Cookie', await commitSession(session))
      return c.text('state mismatch', 400)
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
    } catch (_) {
      isMember = false
    }

    session.set('id', String(user.id))
    session.set('display_name', user.login)
    session.set('profile_image', user.avatar_url)

    if (!isMember) {
      session.set('is_member', false)
      session.set('teams', [])
    } else {
      session.set('is_member', true)

      // チーム数およびメンバー数が 100 以下である前提
      // 超える場合には Pagination を用いて取得する必要がある
      const { data: teams } = await appOctokit.request(
        'GET /orgs/{org}/teams',
        {
          org: 'saitamau-maximum',
          per_page: 100,
        },
      )
      const teamsMembers = await Promise.all(
        teams.map(async team => {
          const { data: members } = await appOctokit.request(
            'GET /orgs/{org}/teams/{team_slug}/members',
            {
              org: 'saitamau-maximum',
              team_slug: team.slug,
              per_page: 100,
            },
          )
          return [team.name, members] as const
        }),
      )

      session.set(
        'teams',
        teamsMembers
          .filter(team => team[1].some(member => member.id === user.id))
          .map(team => team[0]),
      )
    }

    c.header('Set-Cookie', await commitSession(session))
    return c.redirect('/continue', 302)
  },
)

app.all('/', async c => {
  return c.text('method not allowed', 405)
})

export default app
