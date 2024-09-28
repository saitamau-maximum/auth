/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { jwtVerify } from 'jose'

import { importKey, keypairProtectedHeader, PROXY_PUBKEY } from './internal'

interface Options {
  proxyPubkey?: string
}

const validateRequest = async (header: Headers, options?: Options) => {
  const proxyPubkey = options?.proxyPubkey || PROXY_PUBKEY

  if (
    ['X-Maximum-Auth-Pubkey', 'X-Maximum-Auth-Token'].some(
      key => !header.has(key),
    )
  ) {
    return false
  }

  if (proxyPubkey !== header.get('X-Maximum-Auth-Pubkey')) {
    return false
  }

  const pubkey = await importKey(proxyPubkey, 'publicKey')

  return await jwtVerify(header.get('X-Maximum-Auth-Token')!, pubkey, {
    algorithms: [keypairProtectedHeader.alg],
    issuer: 'maximum-auth-proxy',
    subject: 'Maximum Auth Proxy',
    clockTolerance: 5,
  })
    .then(() => true)
    .catch(() => false)
}

export { validateRequest }
