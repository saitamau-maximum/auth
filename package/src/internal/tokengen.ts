import { EncryptJWT, jwtDecrypt } from 'jose'

import { symmetricProtectedHeader } from './keygen'

interface ITokenPayload {
  name: string
  pubkey: string
  callback: string
}

const subj = 'Maximum Auth Token'
const aud = 'maximum-auth'
const iss = 'maximum-auth'

export const generateToken = async ({
  name,
  pubkey,
  callback,
  symkey,
}: {
  name: string
  pubkey: string
  callback: string
  symkey: CryptoKey
}) => {
  return await new EncryptJWT({ name, pubkey, callback })
    .setSubject(subj)
    .setAudience(aud)
    .setIssuer(iss)
    .setNotBefore('0 sec')
    .setIssuedAt()
    .setExpirationTime('10 sec')
    .setProtectedHeader(symmetricProtectedHeader)
    .encrypt(symkey)
}

export const verifyToken = async ({
  name,
  pubkey,
  callback,
  symkey,
  token,
}: {
  name: string | null
  pubkey: string | null
  callback: string | null
  symkey: CryptoKey
  token: string | null
}): Promise<[boolean, string]> => {
  if (!name || !pubkey || !callback || !token) return [false, 'invalid request']

  const { payload } = await jwtDecrypt<ITokenPayload>(token, symkey, {
    subject: subj,
    audience: aud,
    issuer: iss,
    clockTolerance: 5,
  }).catch(() => ({ payload: null }))
  if (!payload) return [false, 'invalid token']

  if (
    payload.name !== name ||
    payload.pubkey !== pubkey ||
    payload.callback !== callback
  )
    return [false, 'invalid token']

  return [true, 'valid token']
}
