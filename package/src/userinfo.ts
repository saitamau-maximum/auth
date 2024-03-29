import { parse as parseCookie } from 'cookie'
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

import {
  AUTH_DOMAIN,
  derivePublicKey,
  exportKey,
  importKey,
  verify,
} from './internal'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault('Asia/Tokyo')

interface Options {
  /**
   * Auth サーバの Origin
   * @default 'https://auth.maximum.vc'
   */
  authOrigin?: string
  /**
   * 認証に使用する名前
   * [saitamau-maximum/auth](https://github.com/saitamau-maximum/auth) に登録している名前を使用する
   */
  authName: string
  /**
   * 認証に使用する秘密鍵
   * [saitamau-maximum/auth](https://github.com/saitamau-maximum/auth) に登録している公開鍵と対応したものを使用する
   */
  privateKey: string
  /**
   * Dev mode
   */
  dev?: boolean
}

// 詳細は webapp/app/routes/continue/route.tsx
interface UserInfo {
  // webapp/utils/session.server.ts の SessionData
  id: string
  display_name: string
  profile_image: string
  teams: string[]
  is_member: boolean

  time: number
}

const checkLoggedIn = async (
  request: Request,
  publicKey: CryptoKey | null,
  isDev?: boolean,
) => {
  const cookie = parseCookie(request.headers.get('Cookie') || '')

  if (isDev) {
    return !!cookie['__dev_logged_in']
  } else if (publicKey === null) {
    throw new Error('publicKey が null です')
  }

  if (
    !cookie['__authdata'] ||
    !cookie['__iv'] ||
    !cookie['__sign1'] ||
    !cookie['__sign2'] ||
    !cookie['__sign3']
  ) {
    return false
  }

  // ほんとはいつ認証したかについてもチェックすべきかもだが、
  // サブリクエスト数が多くなっても困るので簡易的にチェック
  const authdata = cookie['__authdata']
  const iv = cookie['__iv']
  const sig = cookie['__sign2']
  const sigIv = cookie['__sign3']
  return (
    (await verify(authdata, sig, publicKey)) &&
    (await verify(iv, sigIv, publicKey))
  )
}

const getUserInfo = async (
  request: Request,
  options: Options,
): Promise<UserInfo | null> => {
  for (const key of ['authName', 'privateKey'] as const) {
    if (!options[key]) {
      throw new Error(`options.${key} は必須です`)
    }
  }

  if (options.dev) {
    if (!(await checkLoggedIn(request, null, true))) {
      return null
    }

    const DUMMY_USERDATA: UserInfo = {
      id: '120705481',
      display_name: 'saitamau-maximum',
      is_member: true,
      profile_image: 'https://avatars.githubusercontent.com/u/120705481?v=4',
      teams: ['leaders'],
      time: dayjs.tz().valueOf(),
    }

    return DUMMY_USERDATA
  }

  const privateKey = await importKey(options.privateKey, 'privateKey')
  const publicKey = await derivePublicKey(privateKey)

  if (await checkLoggedIn(request, publicKey)) {
    // checkLoggedIn で Cookie があることを前提としている
    const cookie = parseCookie(request.headers.get('Cookie')!)

    const postData = {
      name: options.authName,
      pubkey: await exportKey(publicKey),
      data: cookie['__authdata'],
      iv: cookie['__iv'],
      sgn1: cookie['__sign1'],
      sgn2: cookie['__sign2'],
      sgn3: cookie['__sign3'],
    }

    const authOrigin = options.authOrigin || AUTH_DOMAIN

    const res = await fetch(`${authOrigin}/user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
    })

    if (res.status === 200) {
      const data = await res.json<UserInfo>()
      if (!data.is_member) return null
      return data
    } else {
      console.error(res.status, res.statusText)
      return null
    }
  }
  return null
}

export { UserInfo, checkLoggedIn, getUserInfo }
