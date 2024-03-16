import { sign, verify } from './keygen'

const generateGoParamBase = (
  name: string,
  pubkey: string,
  token: string,
  iv: string,
) => {
  const param = new URLSearchParams()
  param.set('name', name)
  param.set('pubkey', pubkey)
  param.set('token', token)
  param.set('iv', iv)
  return param
}

export const generateGoParam = async (
  name: string,
  pubkey: string,
  token: string,
  iv: string,
  privateKey: CryptoKey,
) => {
  const baseParam = generateGoParamBase(name, pubkey, token, iv)
  const mac = await sign(baseParam.toString(), privateKey)
  baseParam.set('mac', mac)
  return baseParam.toString()
}

export const verifyMac = async (
  name: string,
  pubkey: string,
  token: string,
  iv: string,
  mac: string,
  trustedPubkey: CryptoKey,
) => {
  const baseParam = generateGoParamBase(name, pubkey, token, iv)
  return await verify(baseParam.toString(), mac, trustedPubkey)
}
