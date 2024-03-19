import {
  derivePublicKey,
  exportKey,
  importKey,
  generateGoParam,
} from '@saitamau-maximum/auth/internal'

// const authDomain = 'https://auth.maximum.vc'
const authDomain = 'http://127.0.0.1:8788'

export default {
  async fetch(
    request: Request,
    env: Env,
    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url)

    const authName = 'maximum-reverse-proxy'
    const privateKey = await importKey(env.PRIVKEY, 'privateKey')
    const publicKey = await derivePublicKey(privateKey)

    // Callback
    if (url.pathname === '/auth/callback') {
      // TODO: ログイン処理
      throw new Error('Not implemented')
    }

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

    // それ以外の場合は Proxy
    const res = await fetch(url.toString(), {
      ...request,
      headers: {
        ...request.headers,
        // TODO: 専用のヘッダーを追加
      },
    })

    return res
  },
}
