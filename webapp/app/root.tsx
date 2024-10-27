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

import { css } from '@styled-system/css'

import styles from './index.css?url'

export function ErrorBoundary() {
  const error = useRouteError()
  if (isRouteErrorResponse(error)) {
    return (
      <div
        className={css({
          display: 'grid',
          placeItems: 'center',
          height: '100dvh',
          width: '100vw',
        })}
      >
        <div
          className={css({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          })}
        >
          <h1
            className={css({
              fontSize: '4xl',
              fontWeight: 'bold',
              color: 'text',
            })}
          >
            {error.status} - {error.statusText}
          </h1>
          <p>{error.data}</p>
          <p>Are you trying malicious login? 🤔</p>
          <p>&copy; Maximum - Programming Circle at Saitama University.</p>
        </div>
      </div>
    )
  }
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='ja'>
      <head>
        <meta charSet='utf-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <Meta />
        <Links />
      </head>
      <body
        className={css({
          bg: 'gray.50',
        })}
      >
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  return <Outlet />
}

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: styles },
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Noto+Sans:wght@400;500;700&display=swap`,
  },
]
