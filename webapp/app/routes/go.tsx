/* eslint-disable @typescript-eslint/no-non-null-assertion */

import type { LoaderFunction, ActionFunction } from '@remix-run/cloudflare'
import { redirect } from '@remix-run/cloudflare'

import { importKey, verifyToken } from '@saitamau-maximum/auth/internal'

import pubkeyData from '../../data/pubkey.json'
import cookieSessionStorage from '../../utils/session.server'

export const action: ActionFunction = () =>
  new Response('method not allowed', { status: 405 })

export const loader: LoaderFunction = async ({ context, request }) => {
  const envvar = context.cloudflare.env
  const params = new URL(request.url).searchParams

  // リクエスト検証
  // TODO: ちゃんとテストを書く
  if (
    ['name', 'pubkey', 'callback', 'token'].some(
      key => !params.has(key) || params.getAll(key).length !== 1,
    )
  ) {
    throw new Response('invalid request', { status: 400 })
  }

  if (!URL.canParse(params.get('callback')!)) {
    throw new Response('invalid request', { status: 400 })
  }

  const cbUrl = new URL(params.get('callback')!)
  if (
    cbUrl.username !== '' ||
    cbUrl.password !== '' ||
    cbUrl.search !== '' ||
    cbUrl.hash !== ''
  ) {
    throw new Response('invalid request', { status: 400 })
  }

  const registeredData = pubkeyData.find(
    data =>
      data.name === params.get('name')! &&
      data.pubkey === params.get('pubkey')!,
  )

  if (registeredData === undefined) {
    throw new Response('invalid request', { status: 400 })
  }

  try {
    await importKey(registeredData.pubkey, 'publicKey')
  } catch (_) {
    throw new Response('invalid pubkey', { status: 400 })
  }

  const key = await importKey(envvar.SYMKEY, 'symmetric')
  const [isvalid, message] = await verifyToken({
    name: params.get('name'),
    pubkey: params.get('pubkey'),
    callback: params.get('callback'),
    symkey: key,
    token: params.get('token'),
  })
  if (!isvalid) throw new Response(message, { status: 400 })

  const { getSession, commitSession } = cookieSessionStorage(envvar)

  const session = await getSession(request.headers.get('Cookie'))
  session.flash('continue_name', encodeURIComponent(params.get('name')!))
  session.flash('continue_to', params.get('callback')!)

  // ref: https://docs.github.com/ja/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
  const oauthUrl = new URL('https://github.com/login/oauth/authorize')
  const oauthParams = new URLSearchParams()
  oauthParams.set('client_id', envvar.GITHUB_OAUTH_ID)
  oauthParams.set('redirect_uri', `${envvar.CF_PAGES_URL}/cb`)
  oauthParams.set('scope', 'read:user')
  const state = btoa(crypto.getRandomValues(new Uint8Array(16)).toString())
  oauthParams.set('state', state)
  oauthParams.set('allow_signup', 'false')

  session.flash('state', state)

  return redirect(oauthUrl.toString() + '?' + oauthParams.toString(), {
    status: 302,
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  })
}
