import { sign, verify } from './keygen'

const generateGoParamBase = (
  name: string,
  pubkey: string,
  callback: string,
  token: string,
  iv: string,
) => {
  const param = new URLSearchParams()
  param.set('name', name)
  param.set('pubkey', pubkey)
  param.set('callback', callback)
  param.set('token', token)
  param.set('iv', iv)
  return param
}

export const generateGoParam = async (
  name: string,
  pubkey: string,
  callback: string,
  token: string,
  iv: string,
  privateKey: CryptoKey,
) => {
  const baseParam = generateGoParamBase(name, pubkey, callback, token, iv)
  const mac = await sign(baseParam.toString(), privateKey)
  baseParam.set('mac', mac)
  return baseParam.toString()
}

export const verifyMac = async (
  name: string,
  pubkey: string,
  callback: string,
  token: string,
  iv: string,
  mac: string,
  trustedPubkey: CryptoKey,
) => {
  const baseParam = generateGoParamBase(name, pubkey, callback, token, iv)
  try {
    return await verify(baseParam.toString(), mac, trustedPubkey)
  } catch (e) {
    console.error(e)
    return false
  }
}
