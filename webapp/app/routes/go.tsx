import type { LoaderFunction, MetaFunction } from '@remix-run/cloudflare'
import { redirect } from '@remix-run/cloudflare'

import cookieSessionStorage from '../../utils/session.server'

export const loader: LoaderFunction = async ({ context, params, request }) => {
  const envvar = context.cloudflare.env

  // TODO: リクエストを検証する
  // ...
  params['token']
  params['name']
  params['callback_url']
  params['pubkey']

  const { getSession, commitSession } = cookieSessionStorage(envvar)

  const session = await getSession(request.headers.get('Cookie'))

  if (session.has('id')) {
    return redirect('/continue', {
      status: 302,
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    })
  }

  // ref: https://docs.github.com/ja/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
  const oauthUrl = new URL('https://github.com/login/oauth/authorize')
  const oauthParams = new URLSearchParams()
  oauthParams.append('client_id', envvar.GITHUB_OAUTH_ID)
  oauthParams.append('redirect_uri', `${envvar.CF_PAGES_URL}/cb`)
  oauthParams.append('scope', 'read:user')
  const state = btoa(crypto.getRandomValues(new Uint8Array(16)).toString())
  oauthParams.append('state', state)
  oauthParams.append('allow_signup', 'false')

  session.flash('state', state)

  return redirect(oauthUrl.toString() + '?' + oauthParams.toString(), {
    status: 302,
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  })
}

export const meta: MetaFunction = () => {
  return [
    { title: 'Maximum Auth' },
    { name: 'robots', content: 'noindex, nofollow' },
  ]
}

export default function Go() {
  // リダイレクト用
  return null
}
