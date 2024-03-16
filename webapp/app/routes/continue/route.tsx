import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from '@remix-run/cloudflare'
import { json } from '@remix-run/cloudflare'
import { useLoaderData } from '@remix-run/react'

import { encrypt, importKey, sign } from '@saitamau-maximum/auth'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault('Asia/Tokyo')

import pubkeyData from '../../../data/pubkey.json'
import cookieSessionStorage from '../../../utils/session.server'

export const action: ActionFunction = () =>
  new Response('method not allowed', { status: 405 })

export const loader: LoaderFunction = async ({ context, request }) => {
  const envvar = context.cloudflare.env

  const { getSession } = cookieSessionStorage(envvar)
  const session = await getSession(request.headers.get('Cookie'))

  const cburl = session.get('continue_to')
  const cbname = decodeURIComponent(session.get('continue_name')!)

  const registeredData = pubkeyData.find(data => data.name === cbname)

  if (registeredData === undefined) {
    throw new Response('invalid request', { status: 400 })
  }

  const symkey = await importKey(context.cloudflare.env.SYMKEY, 'symmetric')
  const privkey = await importKey(context.cloudflare.env.PRIVKEY, 'privateKey')
  const [authdata, iv] = await encrypt(
    JSON.stringify({ ...session.data, time: dayjs.tz().valueOf() }),
    symkey,
  )
  const signature = await sign(authdata, privkey)
  const signatureIv = await sign(iv, privkey)

  return json({
    userdata: session.data,
    appdata: { ...registeredData, callback: cburl },
    authdata,
    iv,
    signature,
    signatureIv,
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
  const continueUrl = `${data.appdata.callback}?authdata=${data.authdata}&iv=${data.iv}&signature=${data.signature}&signatureIv=${data.signatureIv}`

  return (
    <>
      {data.userdata.id ? (
        <>
          <div>
            <img src={data.userdata.profile_image} alt='Profile' />
            <span>Logged In as {data.userdata.display_name}</span>
          </div>
          <div>
            <span>{data.appdata.name}</span> に移動します。OK？
            <a href={continueUrl}>続ける</a>
            <a href={`${data.appdata.callback}?cancel=true`}>やっぱりやめる</a>
          </div>
        </>
      ) : (
        <>
          <p>Maximum メンバーではないため、続行できません。</p>
          <a href='to_be_filled'>ログアウトする</a>
        </>
      )}
    </>
  )
}
