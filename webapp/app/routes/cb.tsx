import type { ActionFunction, LoaderFunction } from '@remix-run/cloudflare'
import { redirect } from '@remix-run/react'

import { createAppAuth } from '@octokit/auth-app'
import { Octokit } from 'octokit'

import cookieSessionStorage from '../../utils/session.server'

export const action: ActionFunction = () =>
  new Response('method not allowed', { status: 405 })

export const loader: LoaderFunction = async ({ context, request }) => {
  const envvar = context.cloudflare.env
  const params = new URL(request.url).searchParams

  const { getSession, commitSession } = cookieSessionStorage(envvar)
  const session = await getSession(request.headers.get('Cookie'))

  // ----- OAuth ----- //
  if (!params.has('code') || !params.has('state')) {
    throw new Response('invalid request', { status: 400 })
  }

  if (params.get('state') !== session.get('state')) {
    throw new Response('state mismatch', {
      status: 400,
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    })
  }

  interface GitHubOAuthTokenResponse {
    access_token: string
    scope: string
    token_type: string
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
        client_id: envvar.GITHUB_OAUTH_ID,
        client_secret: envvar.GITHUB_OAUTH_SECRET,
        code: params.get('code'),
      }),
    },
  ).then(res => res.json<GitHubOAuthTokenResponse>())

  // ----- メンバーの所属判定 ----- //
  const userOctokit = new Octokit({ auth: access_token })
  const appOctokit = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: envvar.GITHUB_APP_ID,
      privateKey: atob(envvar.GITHUB_APP_PRIVKEY),
      installationId: '41674415',
    },
  })

  const { data: user } = await userOctokit.request('GET /user')

  const { data: maximumMembers } = await appOctokit.request(
    'GET /orgs/{org}/members',
    { org: 'saitamau-maximum', per_page: 100 },
  )

  const isMember = maximumMembers.some(member => member.id === user.id)
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
    const { data: teams } = await appOctokit.request('GET /orgs/{org}/teams', {
      org: 'saitamau-maximum',
      per_page: 100,
    })
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

  return redirect('/continue', {
    status: 302,
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  })
}
