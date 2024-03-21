import { parse as parseCookie } from 'cookie'

import {
  AUTH_DOMAIN,
  derivePublicKey,
  exportKey,
  importKey,
  verify,
} from './internal'

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
}

// 詳細は webapp/app/routes/continue/route.tsx
interface UserInfo {
  // webapp/utils/session.server.ts の SessionData
  id: string | null
  display_name?: string
  profile_image?: string
  teams?: string[]

  time: number
}

const checkLoggedIn = async (request: Request, publicKey: CryptoKey) => {
  const cookie = parseCookie(request.headers.get('Cookie') || '')

  if (
    !cookie['__authdata'] ||
    !cookie['__iv'] ||
    !cookie['__sign1'] ||
    !cookie['__sign2']
  ) {
    return false
  }

  // ほんとはいつ認証したかについてもチェックすべきかもだが、
  // サブリクエスト数が多くなっても困るので簡易的にチェック
  const authdata = cookie['__authdata']
  const sig = cookie['__sign2']
  return await verify(authdata, sig, publicKey)
}

const getUserInfo = async (
  request: Request,
  options: Options,
): Promise<[boolean, UserInfo | null]> => {
  for (const key of ['authName', 'privateKey'] as const) {
    if (!options[key]) {
      throw new Error(`options.${key} は必須です`)
    }
  }

  const privateKey = await importKey(options.privateKey, 'privateKey')
  const publicKey = await derivePublicKey(privateKey)

  if (await checkLoggedIn(request, publicKey)) {
    const cookie = parseCookie(request.headers.get('Cookie') || '')

    const postData = {
      name: options.authName,
      pubkey: await exportKey(publicKey),
      data: cookie['__authdata'],
      iv: cookie['__iv'],
      sgn1: cookie['__sign1'],
      sgn2: cookie['__sign2'],
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
      return [true, await res.json()]
    } else {
      console.error(res.status, res.statusText)
      return [false, null]
    }
  }
  return [false, null]
}

export { UserInfo, checkLoggedIn, getUserInfo }
