import { handleCallback, handleLogin, handleLogout, handleMe } from './internal'
import { getUserInfo } from './userinfo'

interface Env {
  AUTH_NAME: string
  PRIVKEY: string
  AUTH_DOMAIN?: string
  AUTH_PUBKEY?: string
  IS_DEV?: string
}

const middleware: PagesFunction<Env> = async context => {
  for (const key of ['AUTH_NAME', 'PRIVKEY'] as const) {
    if (!context.env[key]) {
      throw new Error(`context.env.${key} は必須です`)
    }
  }

  const reqUrl = new URL(context.request.url)
  const isDev = context.env.IS_DEV === 'true'

  if (reqUrl.pathname.startsWith('/auth/')) {
    if (reqUrl.pathname === '/auth/callback') {
      return handleCallback(context.request, {
        authName: context.env.AUTH_NAME,
        privateKey: context.env.PRIVKEY,
        authPubkey: context.env.AUTH_PUBKEY,
        dev: isDev,
      })
    }

    if (reqUrl.pathname === '/auth/logout') {
      return handleLogout(context.request)
    }

    if (isDev && reqUrl.pathname === '/auth/login') {
      return handleLogin(context.request, {
        authName: context.env.AUTH_NAME,
        privateKey: context.env.PRIVKEY,
        authOrigin: context.env.AUTH_DOMAIN,
        dev: isDev,
      })
    }

    if (reqUrl.pathname === '/auth/me') {
      return handleMe(context.request, {
        authName: context.env.AUTH_NAME,
        privateKey: context.env.PRIVKEY,
        authOrigin: context.env.AUTH_DOMAIN,
        dev: isDev,
      })
    }

    return new Response('not found', { status: 404 })
  }

  const userInfo = await getUserInfo(context.request, {
    authName: context.env.AUTH_NAME,
    privateKey: context.env.PRIVKEY,
    authOrigin: context.env.AUTH_DOMAIN,
    dev: isDev,
  })

  if (!userInfo) {
    return handleLogin(context.request, {
      authName: context.env.AUTH_NAME,
      privateKey: context.env.PRIVKEY,
      authOrigin: context.env.AUTH_DOMAIN,
      dev: isDev,
    })
  }

  return context.next()
}

export { middleware }
