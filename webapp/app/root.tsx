import type { LinksFunction } from '@remix-run/cloudflare'
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useRouteError,
} from '@remix-run/react'

import './global.css'

const usedCharacters = Array.from(
  new Set(
    [
      // 英数字記号
      '0123456789 - abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.?:/🤔',
      // _index/route.tsx
      'Maximum Auth',
      'Aggregated Authentication Platform of Maximum',
      '認証が必要なサイトからアクセスしてください。',
      // continue/route.tsx
      '以下のサイトにログインします。',
      '続ける',
      'やめる',
      'Maximum メンバーではないため、続行できません。',
      'このタブを閉じてください。',
      // keygen/route.tsx
      'Key Generator',
      'Maximum Auth 向けの公開鍵・秘密鍵を生成します。再読み込みすると新しく生成されます。',
      '秘密鍵は環境変数に置くなどして公開しないようにしてください。公開鍵は saitamau-maximum/auth で必要となるため PR を提出してください。',
    ]
      .join('')
      .split(''),
  ),
).join('')

export function ErrorBoundary() {
  const error = useRouteError()
  if (isRouteErrorResponse(error)) {
    return (
      <html lang='ja'>
        <head>
          <meta charSet='utf-8' />
          <meta name='viewport' content='width=device-width, initial-scale=1' />
          <Meta />
          <Links />
        </head>
        <body>
          <main>
            <h1>
              {error.status} - {error.statusText}
            </h1>
            <p>{error.data}</p>
            <p>Are you trying malicious login? 🤔</p>
            <p>&copy; Maximum - Programming Circle at Saitama University.</p>
          </main>
          <ScrollRestoration />
          <Scripts />
        </body>
      </html>
    )
  }
}

export default function App() {
  return (
    <html lang='ja'>
      <head>
        <meta charSet='utf-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <link rel='preconnect' href='https://fonts.googleapis.com' />
        <link
          rel='preconnect'
          href='https://fonts.gstatic.com'
          crossOrigin='anonymous'
        />
        <link
          href={`https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Noto+Sans:wght@400;500;700&display=swap&text=${usedCharacters}`}
          rel='stylesheet'
        />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export const links: LinksFunction = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Noto+Sans:wght@400;500;700&display=swap&text=${usedCharacters}`,
  },
]
