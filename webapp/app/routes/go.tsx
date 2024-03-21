import type { LoaderFunction, ActionFunction } from '@remix-run/cloudflare'
import { redirect } from '@remix-run/cloudflare'

import {
  importKey,
  verifyToken,
  verifyMac,
} from '@saitamau-maximum/auth/internal'

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
    ['name', 'pubkey', 'callback', 'token', 'iv', 'mac'].some(
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

  let theirPubkey: CryptoKey
  try {
    theirPubkey = await importKey(registeredData.pubkey, 'publicKey')
  } catch (e) {
    throw new Response('invalid pubkey', { status: 400 })
  }
  if (!theirPubkey.usages.includes('verify'))
    throw new Response('invalid pubkey', { status: 400 })

  const macVerifyResult = await verifyMac(
    params.get('name')!,
    params.get('pubkey')!,
    params.get('callback')!,
    params.get('token')!,
    params.get('iv')!,
    params.get('mac')!,
    theirPubkey,
  )
  if (!macVerifyResult) throw new Response('invalid mac', { status: 400 })

  const key = await importKey(envvar.SYMKEY, 'symmetric')
  const [verifyResult, message] = await verifyToken(
    params.get('name')!,
    params.get('pubkey')!,
    params.get('callback')!,
    key,
    params.get('token')!,
    params.get('iv')!,
  )

  if (!verifyResult) throw new Response(message, { status: 400 })

  const { getSession, commitSession } = cookieSessionStorage(envvar)

  const session = await getSession(request.headers.get('Cookie'))
  session.flash('continue_name', encodeURIComponent(params.get('name')!))
  session.flash('continue_to', params.get('callback')!)

  if (session.get('is_member')) {
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
