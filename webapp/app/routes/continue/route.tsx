/* eslint-disable @typescript-eslint/no-non-null-assertion */

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
import clsx from 'clsx'
import { SignJWT } from 'jose'

import pubkeyData from '../../../data/pubkey.json'
import cookieSessionStorage from '../../../utils/session.server'

import style from './style.module.css'

export const action: ActionFunction = () =>
  new Response('method not allowed', { status: 405 })

export const loader = async ({ context, request }: LoaderFunctionArgs) => {
  const envvar = context.cloudflare.env

  const { getSession } = cookieSessionStorage(envvar)
  const session = await getSession(request.headers.get('Cookie'))

  const cburl = session.get('continue_to')!
  const cbname = decodeURIComponent(session.get('continue_name')!)

  const registeredData = pubkeyData.find(data => data.name === cbname)

  if (registeredData === undefined) {
    throw new Response('invalid request', { status: 400 })
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
    <main className={style.main}>
      <div className={style.container}>
        <div className={style.left}>
          <img
            src='/logo.svg'
            alt='Maximum Logo'
            width={200}
            height={50}
            className={style.logo}
          />
          <div className={style.profile}>
            <img
              src={data.userdata.profile_image}
              alt='Profile'
              className={style.profileImg}
            />
            <p className={style.profileName}>{data.userdata.display_name}</p>
          </div>
        </div>
        <div className={style.right}>
          {data.userdata.is_member ? (
            <>
              <p className={style.loginMsg}>以下のサイトにログインします。</p>
              <p className={style.serviceDetail}>
                <span className={style.serviceName}>{data.appdata.name}</span>
                <br />
                <span className={style.serviceUrl}>({continueUrl.origin})</span>
              </p>
              <a
                href={continueUrl.toString()}
                className={clsx(style.btn, style.continueBtn)}
              >
                続ける
              </a>
              <a
                href={cancelUrl.toString()}
                className={clsx(style.btn, style.cancelBtn)}
              >
                やめる
              </a>
            </>
          ) : (
            <>
              <p>
                Maximum メンバーではないため、
                <br />
                続行できません。
              </p>
              <p>このタブを閉じてください。</p>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
