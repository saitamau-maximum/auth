interface Param {
  clientId: string
  redirectUri: string
  state: string
  scope: string
  time: number
}

interface GenerateParam extends Param {
  key: CryptoKey
}

interface ValidateParam extends Param {
  key: CryptoKey
  hash: string
}

const content = (param: Param) => {
  const p = new URLSearchParams()
  p.append('client_id', param.clientId)
  p.append('redirect_uri', param.redirectUri)
  p.append('state', param.state)
  p.append('scope', param.scope)
  p.append('time', param.time.toString())
  return new TextEncoder().encode(p.toString())
}

const alg = {
  name: 'ECDSA',
  hash: 'SHA-512',
}

export const generateAuthToken = async (param: GenerateParam) => {
  const { key, ...rest } = param
  const signedBuf = await crypto.subtle.sign(alg, key, content(rest))
  return btoa(Array.from(new Uint8Array(signedBuf)).join(','))
}

export const validateAuthToken = (param: ValidateParam) => {
  const { key, hash, ...rest } = param
  const signBuf = new Uint8Array(
    atob(hash)
      .split(',')
      .map(byte => parseInt(byte, 10)),
  )
  return crypto.subtle.verify(alg, key, signBuf, content(rest))
}
