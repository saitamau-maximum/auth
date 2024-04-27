import { serialize as serializeCookie } from 'cookie'

import { cookieOptions } from './cookie'

const usedCharacters = Array.from(
  new Set(
    [
      'Maximum Auth',
      'ログアウトしました。再度ページにアクセスするにはログインが必要です。',
      'ログインしない場合は、このタブを閉じてください。',
      'もう一度ログインする',
    ]
      .join('')
      .split(''),
  ),
).join('')

// CSS は webapp の global.css と continue/style.module.css からコピペ
const logoutHtml = `<!DOCTYPE html>
<html lang='ja'>
<head>
<meta charset='utf-8'>
<meta name='viewport' content='width=device-width, initial-scale=1'>
<link rel='preconnect' href='https://fonts.googleapis.com' />
<link rel='preconnect' href='https://fonts.gstatic.com' crossorigin='anonymous' />
<link href='https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Noto+Sans:wght@400;500;700&display=swap&text=${usedCharacters}' rel='stylesheet' />
<title>ログアウト</title>
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
</style>
</head>
<body>
  <main>
    <h1>Maximum Auth</h1>
    <p>ログアウトしました。再度ページにアクセスするにはログインが必要です。</p>
    <p>ログインしない場合は、このタブを閉じてください。</p>
    <a href='/' class="btn continueBtn">もう一度ログインする</a>
  </main>
</body>
</html>
`

export const handleLogout = async (request: Request): Promise<Response> => {
  const newHeader = new Headers(request.headers)
  newHeader.append(
    'Set-Cookie',
    serializeCookie('__authdata', '', {
      ...cookieOptions,
      maxAge: -1,
    }),
  )
  newHeader.append(
    'Set-Cookie',
    serializeCookie('__iv', '', {
      ...cookieOptions,
      maxAge: -1,
    }),
  )
  newHeader.append(
    'Set-Cookie',
    serializeCookie('__sign1', '', {
      ...cookieOptions,
      maxAge: -1,
    }),
  )
  newHeader.append(
    'Set-Cookie',
    serializeCookie('__sign2', '', {
      ...cookieOptions,
      maxAge: -1,
    }),
  )
  newHeader.append(
    'Set-Cookie',
    serializeCookie('__sign3', '', {
      ...cookieOptions,
      maxAge: -1,
    }),
  )
  newHeader.append(
    'Set-Cookie',
    serializeCookie('__continue_to', '', {
      ...cookieOptions,
      maxAge: -1,
    }),
  )
  newHeader.append(
    'Set-Cookie',
    serializeCookie('__dev_logged_in', '', {
      ...cookieOptions,
      maxAge: -1,
    }),
  )
  newHeader.set('Content-Type', 'text/html')

  return new Response(logoutHtml, {
    status: 200,
    headers: newHeader,
  })
}
