import { importKey, PROXY_PUBKEY, verify } from './internal'

interface Options {
  proxyPubkey?: string
}

const validateRequest = async (header: Headers, options: Options) => {
  const proxyPubkey = options.proxyPubkey || PROXY_PUBKEY

  if (
    [
      'X-Maximum-Auth-Pubkey',
      'X-Maximum-Auth-Name',
      'X-Maximum-Auth-Key',
      'X-Maximum-Auth-Mac',
    ].some(key => !header.has(key))
  ) {
    return false
  }

  if (proxyPubkey !== header.get('X-Maximum-Auth-Pubkey')) {
    return false
  }

  const pubkey = await importKey(proxyPubkey, 'publicKey')

  return await verify(
    header.get('X-Maximum-Auth-Key')!,
    header.get('X-Maximum-Auth-Mac')!,
    pubkey,
  )
}

export { validateRequest }
