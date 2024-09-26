/* eslint-disable @typescript-eslint/no-non-null-assertion */

// Memo: Cloudflare Types で型推論されてしまうが、テスト時は jsdom なので Web Standard に従う
const cookieParser = (cookieString: string) => {
  const mp = new Map<string, [string, Map<string, string>]>()
  const cookies = cookieString.split(',').map(c => c.trim())
  for (const cookie of cookies) {
    const [keyval, ...opts] = cookie.split(';')
    const [key, val] = keyval.split('=')
    const optMap = new Map<string, string>()
    for (const opt of opts) {
      if (!opt.includes('=')) {
        optMap.set(decodeURIComponent(opt.trim()), '')
        continue
      }
      const [optKey, optVal] = opt.split('=')
      optMap.set(
        decodeURIComponent(optKey.trim()),
        decodeURIComponent(optVal.trim()),
      )
    }
    mp.set(decodeURIComponent(key), [decodeURIComponent(val), optMap])
  }
  return mp
}

const removesCookie = (
  cookie: ReturnType<typeof cookieParser>,
  key: string,
) => {
  if (!cookie.has(key)) return false
  const [val, opts] = cookie.get(key)!
  return (
    val === '' && opts.has('Max-Age') && parseInt(opts.get('Max-Age')!) <= 0
  )
}

export { cookieParser, removesCookie }
