import { parse as parseCookie, serialize as serializeCookie } from 'cookie'

import { AUTH_PUBKEY } from './const'
import { cookieOptions } from './cookie'
import { importKey, sign, verify } from './keygen'

interface Options {
  /**
   * Auth サーバの 公開鍵
   * @default truncated
   */
  authPubkey?: string
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

export const handleCallback = async (
  request: Request,
  options: Options,
): Promise<Response> => {
  for (const key of ['authName', 'privateKey'] as const) {
    if (!options[key]) {
      throw new Error(`options.${key} は必須です`)
    }
  }

  const param = new URL(request.url).searchParams

  if (param.has('cancel')) {
    // TODO: UI しっかりする
    return new Response(
      '認証をキャンセルしました。このページにアクセスするにはログインが必要です。 <a href="/">再ログイン</a><a href="/auth/logout">ログアウト</a>',
      {
        status: 401,
        headers: {
          'Set-Cookie': serializeCookie('__continue_to', '', {
            ...cookieOptions,
            maxAge: -1,
          }),
          'Content-Type': 'text/html',
        },
      },
    )
  }

  if (
    ['authdata', 'iv', 'signature', 'signatureIv'].some(
      key => !param.has(key) || param.getAll(key).length !== 1,
    )
  ) {
    return new Response('invalid request', { status: 400 })
  }

  const authPubkey = await importKey(
    options.authPubkey || AUTH_PUBKEY,
    'publicKey',
  )
  const privateKey = await importKey(options.privateKey, 'privateKey')

  if (
    !(await verify(
      param.get('authdata')!,
      param.get('signature')!,
      authPubkey,
    )) ||
    !(await verify(param.get('iv')!, param.get('signatureIv')!, authPubkey))
  ) {
    return new Response('invalid signature', { status: 400 })
  }

  const cookieData = request.headers.get('Cookie')
  if (!cookieData) {
    return new Response('invalid request', { status: 400 })
  }

  const continueUrl = parseCookie(cookieData)['__continue_to']

  const newHeader = new Headers(request.headers)
  newHeader.append(
    'Set-Cookie',
    serializeCookie('__continue_to', '', {
      ...cookieOptions,
      maxAge: -1,
    }),
  )
  newHeader.append(
    'Set-Cookie',
    serializeCookie('__authdata', param.get('authdata')!, cookieOptions),
  )
  newHeader.append(
    'Set-Cookie',
    serializeCookie('__iv', param.get('iv')!, cookieOptions),
  )
  newHeader.append(
    'Set-Cookie',
    serializeCookie('__sign1', param.get('signature')!, cookieOptions),
  )
  newHeader.append(
    'Set-Cookie',
    serializeCookie(
      '__sign2',
      await sign(param.get('authdata')!, privateKey),
      cookieOptions,
    ),
  )
  newHeader.set('Location', continueUrl || '/')

  return new Response(null, {
    status: 302,
    headers: newHeader,
  })
}
