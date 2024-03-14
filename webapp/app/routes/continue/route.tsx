import {
  json,
  type LoaderFunction,
  type MetaFunction,
} from '@remix-run/cloudflare'
import { useLoaderData } from '@remix-run/react'

import cookieSessionStorage from '../../../utils/session.server'

export const loader: LoaderFunction = async ({ context, request }) => {
  const envvar = context.cloudflare.env

  const { getSession } = cookieSessionStorage(envvar)
  const session = await getSession(request.headers.get('Cookie'))

  return json({ data: session.data })
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
      {JSON.stringify(data.data)}
      このページに移動します。 OK？
      <br />
      続ける → <br />
      やっぱりやめる
      <hr />
      or Maximum メンバーじゃないのでアクセスする権限がないよ！
    </>
  )
}
