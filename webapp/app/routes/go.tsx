import type { LoaderFunction, ActionFunction } from '@remix-run/cloudflare'
import { redirect } from '@remix-run/cloudflare'

import pubkeyData from '../../data/pubkey.json'
import { importKey, verify } from '../../utils/keygen'
import cookieSessionStorage from '../../utils/session.server'
import { verifyToken } from '../../utils/tokengen'

export const action: ActionFunction = () =>
  new Response('method not allowed', { status: 405 })

export const loader: LoaderFunction = async ({ context, request }) => {
  const envvar = context.cloudflare.env
  const params = new URL(request.url).searchParams

  // リクエスト検証
  // TODO: ちゃんとテストを書く
  if (
    !params.has('token') ||
    !params.has('name') ||
    !params.has('pubkey') ||
    !params.has('iv') ||
    !params.has('mac')
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

  const data4mac = new URLSearchParams({
    token: params.get('token')!,
    name: params.get('name')!,
    pubkey: params.get('pubkey')!,
    iv: params.get('iv')!,
  }).toString()

  if (!(await verify(data4mac, params.get('mac')!, theirPubkey)))
    throw new Response('invalid mac', { status: 400 })

  const key = await importKey(envvar.SYMKEY, 'symmetric')
  const [verifyResult, message] = await verifyToken(
    registeredData.name,
    registeredData.pubkey,
    key,
    params.get('token')!,
    params.get('iv')!,
  )

  if (!verifyResult) throw new Response(message, { status: 400 })

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
  session.flash('continue_to', registeredData.callback)

  return redirect(oauthUrl.toString() + '?' + oauthParams.toString(), {
    status: 302,
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  })
}
