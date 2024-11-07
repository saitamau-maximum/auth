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

export const generateAuthToken = (param: GenerateParam) => {
  const { key, ...rest } = param
  return crypto.subtle.sign(alg, key, content(rest))
}

export const validateAuthToken = (param: ValidateParam) => {
  const { key, hash, ...rest } = param
  return crypto.subtle.verify(
    alg,
    key,
    new TextEncoder().encode(hash),
    content(rest),
  )
}
