import { serialize as serializeCookie } from 'cookie'

import { AUTH_DOMAIN } from './const'
import { cookieOptions } from './cookie'
import { generateGoParam } from './goparam'
import { derivePublicKey, exportKey, importKey } from './keygen'

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

export const handleLogin = async (
  request: Request,
  options: Options,
): Promise<Response> => {
  for (const key of ['authName', 'privateKey'] as const) {
    if (!options[key]) {
      throw new Error(`options.${key} は必須です`)
    }
  }

  const reqUrl = new URL(request.url)
  const callbackUrl = `${reqUrl.origin}/auth/callback`
  const authOrigin = options.authOrigin || AUTH_DOMAIN
  const privkey = await importKey(options.privateKey, 'privateKey')
  const pubkey = await derivePublicKey(privkey)

  const redirectData = await fetch(`${authOrigin}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: options.authName,
      pubkey: await exportKey(pubkey),
      callback: callbackUrl,
    }),
  })
    .then(res => res.json<{ token: string; iv: string }>())
    .catch(() => {
      throw new Error('auth server error', {
        cause:
          'authName or privateKey is incorrect. The auth server might be down.',
      })
    })

  const param = await generateGoParam(
    options.authName,
    await exportKey(pubkey),
    callbackUrl,
    atob(redirectData.token),
    atob(redirectData.iv),
    privkey,
  )

  return new Response(null, {
    status: 302,
    headers: {
      Location: `${options.authOrigin}/go?${param.toString()}`,
      'Set-Cookie': serializeCookie('__continue_to', reqUrl.href, {
        ...cookieOptions,
        maxAge: 60 * 10,
      }),
    },
  })
}
