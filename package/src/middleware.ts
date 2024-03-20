import { handleLogin } from './internal'

interface Env {
  AUTH_NAME: string
  PRIVKEY: string
  AUTH_DOMAIN?: string
}

const middleware: PagesFunction<Env> = async context => {
  for (const key of ['AUTH_NAME', 'PRIVKEY'] as const) {
    if (!context.env[key]) {
      throw new Error(`context.env.${key} は必須です`)
    }
  }

  const reqUrl = new URL(context.request.url)

  if (reqUrl.pathname.startsWith('/auth/')) {
    // to be implemented
  }

  const checkLoggedIn = () => {
    // to be implemented
    return false
  }

  if (!checkLoggedIn()) {
    return handleLogin(context.request, {
      authName: context.env.AUTH_NAME,
      privateKey: context.env.PRIVKEY,
      authOrigin: context.env.AUTH_DOMAIN,
    })
  }

  return context.next()
}

export { middleware }
