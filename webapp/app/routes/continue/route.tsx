import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from '@remix-run/cloudflare'
import { json } from '@remix-run/cloudflare'
import { useLoaderData } from '@remix-run/react'

import pubkeyData from '../../../data/pubkey.json'
import cookieSessionStorage from '../../../utils/session.server'

export const action: ActionFunction = () =>
  new Response('method not allowed', { status: 405 })

export const loader: LoaderFunction = async ({ context, request }) => {
  const envvar = context.cloudflare.env

  const { getSession } = cookieSessionStorage(envvar)
  const session = await getSession(request.headers.get('Cookie'))

  const cburl = session.get('continue_to')
  const registeredData = pubkeyData.find(data => data.callback === cburl)

  if (registeredData === undefined) {
    throw new Response('invalid request', { status: 400 })
  }

  return json({ userdata: session.data, appdata: registeredData })
}

export const meta: MetaFunction = () => {
  return [
    { title: 'Continue - Maximum Auth' },
    { name: 'robots', content: 'noindex, nofollow' },
  ]
}

export default function Continue() {
  const data = useLoaderData<typeof loader>()

  return (
    <>
      {JSON.stringify(data.userdata)}
      <br />
      {JSON.stringify(data.appdata)}
      <br />
      このページに移動します。 OK？
      <br />
      続ける → <br />
      やっぱりやめる
      <hr />
      or Maximum メンバーじゃないのでアクセスする権限がないよ！
    </>
  )
}
