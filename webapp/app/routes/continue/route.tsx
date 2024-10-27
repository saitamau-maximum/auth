import type {
  ActionFunction,
  LoaderFunctionArgs,
  MetaFunction,
} from '@remix-run/cloudflare'
import { json } from '@remix-run/cloudflare'
import { useLoaderData } from '@remix-run/react'

import {
  importKey,
  keypairProtectedHeader,
} from '@saitamau-maximum/auth/internal'
import { SignJWT } from 'jose'
import cookieSessionStorage from 'utils/session.server'

import pubkeyData from '../../../data/pubkey.json'

import { CenterCard } from './_components/center-card'
import { ProfileDisplay } from './_components/profile-display'

export const action: ActionFunction = () =>
  new Response('method not allowed', { status: 405 })

export const loader = async ({ context, request }: LoaderFunctionArgs) => {
  const envvar = context.cloudflare.env

  const { getSession } = cookieSessionStorage(envvar)
  const session = await getSession(request.headers.get('Cookie'))

  const cburl = session.get('continue_to')
  if (cburl == null) {
    throw json('invalid request', { status: 400 })
  }
  let cbname = session.get('continue_name')
  if (cbname == null) {
    throw json('invalid request', { status: 400 })
  }
  cbname = decodeURIComponent(cbname)

  const registeredData = pubkeyData.find(data => data.name === cbname)

  if (registeredData === undefined) {
    throw json('invalid request', { status: 400 })
  }

  const privkey = await importKey(context.cloudflare.env.PRIVKEY, 'privateKey')

  // SessionFlashData は残ってないので、 session.data に残るのは SessionData のみ
  // state: cb.tsx / continue_to, continue_name: この上で取得した際に消える
  // Subject, Audience, Issuer は handleCallback にそろえる
  const jwt = await new SignJWT(session.data)
    .setSubject('Maximum Auth Data')
    .setAudience(registeredData.name)
    .setIssuer('maximum-auth')
    .setNotBefore('0 sec')
    .setIssuedAt()
    .setExpirationTime('5 min')
    .setProtectedHeader(keypairProtectedHeader)
    .sign(privkey)

  return json({
    userdata: session.data,
    appdata: { ...registeredData, callback: cburl },
    token: jwt,
  })
}

export const meta: MetaFunction = () => {
  return [
    { title: 'Continue - Maximum Auth' },
    { name: 'robots', content: 'noindex, nofollow' },
  ]
}

export default function Continue() {
  const data = useLoaderData<typeof loader>()
  const continueUrl = new URL(data.appdata.callback)
  const cancelUrl = new URL(data.appdata.callback)
  continueUrl.searchParams.set('token', data.token)
  cancelUrl.searchParams.set('cancel', 'true')

  return (
    <CenterCard>
      <ProfileDisplay
        cancelUrl={cancelUrl}
        continueUrl={continueUrl}
        user={{
          displayName: data.userdata.display_name,
          profileImage: data.userdata.profile_image,
          isMember: data.userdata.is_member,
        }}
        appName={data.appdata.name}
      />
    </CenterCard>
  )
}
