import { serialize as serializeCookie } from 'cookie'
import { SignJWT } from 'jose'

import { AUTH_DOMAIN } from './const'
import { cookieOptions } from './cookie'
import {
  derivePublicKey,
  exportKey,
  importKey,
  keypairProtectedHeader,
} from './keygen'

const usedCharacters = Array.from(
  new Set(
    ['Maximum Auth', 'Dev Mode Login', '続ける', 'やめる'].join('').split(''),
  ),
).join('')

// CSS は webapp の global.css と continue/style.module.css からコピペ
const devLoginHtml = `<!DOCTYPE html>
<html lang='ja'>
<head>
<meta charset='utf-8'>
<meta name='viewport' content='width=device-width, initial-scale=1'>
<link rel='preconnect' href='https://fonts.googleapis.com' />
<link rel='preconnect' href='https://fonts.gstatic.com' crossorigin='anonymous' />
<link href='https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Noto+Sans:wght@400;500;700&display=swap&text=${usedCharacters}' rel='stylesheet' />
<title>ログイン (Dev)</title>
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
    <p>Dev Mode Login</p>
    <a href='/auth/callback' class="btn continueBtn">続ける</a>
    <a href='/auth/callback?cancel=true' class="btn cancelBtn">やめる</a>
  </main>
</body>
</html>
`

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

  if (options.dev) {
    if (reqUrl.hostname !== 'localhost') {
      throw new Error(
        'dev mode では localhost からのリクエストのみ受け付けます',
      )
    }

    if (reqUrl.pathname === '/auth/login') {
      return new Response(devLoginHtml, {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      })
    }

    const headers = new Headers()
    headers.append(
      'Set-Cookie',
      serializeCookie('__continue_to', reqUrl.href, {
        ...cookieOptions,
        maxAge: 60 * 10,
      }),
    )
    headers.set('Location', '/auth/login')

    return new Response(null, {
      status: 302,
      headers,
    })
  }

  const callbackUrl = `${reqUrl.origin}/auth/callback`
  const authOrigin = options.authOrigin || AUTH_DOMAIN
  const privkey = await importKey(options.privateKey, 'privateKey')
  const pubkey = await derivePublicKey(privkey)
  const mac = await new SignJWT({ callback: callbackUrl })
    .setSubject('Maximum Auth Token')
    .setIssuer(options.authName)
    .setAudience('maximum-auth')
    .setNotBefore('0 sec')
    .setIssuedAt()
    .setExpirationTime('10 sec')
    .setProtectedHeader(keypairProtectedHeader)
    .sign(privkey)

  const token = await fetch(`${authOrigin}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: options.authName,
      pubkey: await exportKey(pubkey),
      callback: callbackUrl,
      mac,
    }),
  }).then(res => {
    if (res.ok) {
      return res.text()
    }
    throw new Error('auth server error', {
      cause:
        'authName or privateKey is incorrect. The auth server might be down.',
    })
  })

  const param = new URLSearchParams()
  param.set('name', options.authName)
  param.set('pubkey', await exportKey(pubkey))
  param.set('callback', callbackUrl)
  param.set('token', token)

  return new Response(null, {
    status: 302,
    headers: {
      Location: `${authOrigin}/go?${param.toString()}`,
      'Set-Cookie': serializeCookie('__continue_to', reqUrl.href, {
        ...cookieOptions,
        maxAge: 60 * 10,
      }),
    },
  })
}
