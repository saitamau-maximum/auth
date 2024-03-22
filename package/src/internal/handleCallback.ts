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
  /**
   * Dev mode
   */
  dev?: boolean
}

// CSS は webapp の global.css と continue/style.module.css からコピペ
const cancelHtml = `<!DOCTYPE html>
<html lang='ja'>
<head>
<meta charset='utf-8'>
<meta name='viewport' content='width=device-width, initial-scale=1'>
<link rel='preconnect' href='https://fonts.googleapis.com' />
<link rel='preconnect' href='https://fonts.gstatic.com' crossorigin='anonymous' />
<link href='https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500&family=Noto+Sans:wght@400;500&display=swap' rel='stylesheet' />
<title>認証をキャンセルしました</title>
<style>
html {
  font-family: 'Noto Sans', 'Noto Sans JP', sans-serif;
  font-weight: 400;
  font-size: 1rem;
  line-height: 1.7;
  letter-spacing: 0.04em;
}

body {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

main {
  width: 1120px;
  max-width: 100%;
  margin: auto;
  padding: 16px;
  box-sizing: border-box;
}

h1 {
  font-weight: 500;
  font-size: 2rem;
  line-height: 1.5;
  letter-spacing: 0.04em;
  margin-top: 64px;
  margin-bottom: 24px;
}

.btn {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  margin: 4px 16px;
  padding-left: 1em;
  padding-right: 1em;
  font-weight: 700;
  font-size: 1rem;
  line-height: 1.5;
  font-family: inherit;
  letter-spacing: 0.04em;
  text-decoration: none;
  min-width: 8rem;
  height: 3rem;
  border-radius: 1.5rem;
}

.btn:hover,
.btn:active,
.btn:focus {
  text-decoration: underline;
}

.continueBtn {
  background: linear-gradient(to left top, #62c077, #34aa8e);
  color: #ffffff;
}

.cancelBtn {
  border: #4bb583 solid 1px;
  color: #4bb583;
  background: #ffffff;
}
</style>
</head>
<body>
  <main>
    <h1>Maximum Auth</h1>
    <p>認証をキャンセルしました。ページにアクセスするにはログインが必要です。</p>
    <a href='/' class="btn continueBtn">もう一度ログインする</a>
    <a href='/auth/logout' class="btn cancelBtn">ログアウトする</a>
  </main>
</body>
</html>
`

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
    return new Response(cancelHtml, {
      status: 401,
      headers: {
        'Set-Cookie': serializeCookie('__continue_to', '', {
          ...cookieOptions,
          maxAge: -1,
        }),
        'Content-Type': 'text/html',
      },
    })
  }

  if (options.dev) {
    const reqUrl = new URL(request.url)

    if (reqUrl.hostname !== 'localhost') {
      throw new Error(
        'dev mode では localhost からのリクエストのみ受け付けます',
      )
    }

    const cookieData = request.headers.get('Cookie')
    if (!cookieData) {
      return new Response('invalid request', { status: 400 })
    }

    const headers = new Headers()
    headers.append(
      'Set-Cookie',
      serializeCookie('__continue_to', '', { ...cookieOptions, maxAge: -1 }),
    )
    headers.append(
      'Set-Cookie',
      serializeCookie('__dev_logged_in', 'true', cookieOptions),
    )

    const continueUrl = parseCookie(cookieData)['__continue_to']
    headers.set('Location', continueUrl || '/')
    return new Response(null, {
      status: 302,
      headers,
    })
  }

  if (
    ['authdata', 'iv', 'signature', 'signatureIv'].some(
      key => !param.has(key) || param.getAll(key).length !== 1,
    )
  ) {
    return new Response('invalid request', { status: 400 })
  }

  const cookieData = request.headers.get('Cookie')
  if (!cookieData) {
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
