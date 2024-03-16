import {
  derivePublicKey,
  exportKey,
  importKey,
  generateGoParam,
} from '@saitamau-maximum/auth'

import handleProxy from './proxy'
import handleRedirect from './redirect'
import apiRouter from './router'

// const authDomain = 'https://auth.maximum.vc'
const authDomain = 'http://127.0.0.1:8788'

// Export a default object containing event handlers
export default {
  // The fetch handler is invoked when this worker receives a HTTP(S) request
  // and should return a Response (optionally wrapped in a Promise)
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url)

    const authName = 'maximum-reverse-proxy'
    const privateKey = await importKey(env.PRIVKEY, 'privateKey')
    const publicKey = await derivePublicKey(privateKey)

    // ログインしてない場合はログインページに移動
    const loggedIn = false
    if (!loggedIn) {
      const callbackUrl = `${url.origin}/auth/callback`

      const redirectData = await fetch(`${authDomain}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: authName,
          pubkey: await exportKey(publicKey),
          callback: callbackUrl,
        }),
      }).then(res => res.json<{ token: string; iv: string }>())

      const param = await generateGoParam(
        authName,
        await exportKey(publicKey),
        callbackUrl,
        atob(redirectData.token),
        atob(redirectData.iv),
        privateKey,
      )

      return new Response(null, {
        status: 302,
        headers: {
          Location: `${authDomain}/go?${param.toString()}`,
        },
      })
    }

    // You can get pretty far with simple logic like if/switch-statements
    switch (url.pathname) {
      case '/redirect':
        return handleRedirect.fetch(request, env, ctx)

      case '/proxy':
        return handleProxy.fetch(request, env, ctx)
    }

    if (url.pathname.startsWith('/api/')) {
      // You can also use more robust routing
      return apiRouter.handle(request)
    }

    return new Response(
      `Try making requests to:
      <ul>
      <li><code><a href="/redirect?redirectUrl=https://example.com/">/redirect?redirectUrl=https://example.com/</a></code>,</li>
      <li><code><a href="/proxy?modify&proxyUrl=https://example.com/">/proxy?modify&proxyUrl=https://example.com/</a></code>, or</li>
      <li><code><a href="/api/todos">/api/todos</a></code></li>`,
      { headers: { 'Content-Type': 'text/html' } },
    )
  },
}
