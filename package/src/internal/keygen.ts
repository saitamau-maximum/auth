// jose の ES512 と同じオプション
const keypairGenAlgorithm = {
  name: 'ECDSA',
  namedCurve: 'P-521',
}
const keypairUsage = ['sign', 'verify']
const keypairProtectedHeader = {
  alg: 'ES512',
}

// jose の A256GCMKW と同じオプション
const symmetricGenAlgorithm = {
  name: 'AES-GCM',
  length: 256,
}
const symmetricUsage = ['encrypt', 'decrypt']
const symmetricProtectedHeader = {
  alg: 'dir',
  enc: 'A256GCM',
}

const keypairHashAlgorithm = {
  name: 'ECDSA',
  hash: 'SHA-512',
}

const generateKeyPair = () =>
  crypto.subtle.generateKey(
    keypairGenAlgorithm,
    true,
    keypairUsage,
  ) as Promise<CryptoKeyPair>

const generateSymmetricKey = () =>
  crypto.subtle.generateKey(
    symmetricGenAlgorithm,
    true,
    symmetricUsage,
  ) as Promise<CryptoKey>

const exportKey = async (key: CryptoKey) => {
  const exportedKey = (await crypto.subtle.exportKey('jwk', key)) as JsonWebKey
  return btoa(JSON.stringify(exportedKey))
}

const importKey = async (
  data: string,
  type: 'publicKey' | 'privateKey' | 'symmetric',
) => {
  const keyData = JSON.parse(atob(data))
  if (type === 'symmetric') {
    return crypto.subtle.importKey(
      'jwk',
      keyData,
      symmetricGenAlgorithm,
      true,
      symmetricUsage,
    )
  }
  return crypto.subtle.importKey(
    'jwk',
    keyData,
    keypairGenAlgorithm,
    true,
    type === 'publicKey' ? ['verify'] : ['sign'],
  )
}

// jose には存在しない
const derivePublicKey = async (privateKey: CryptoKey) => {
  const publicKey = (await crypto.subtle.exportKey(
    'jwk',
    privateKey,
  )) as JsonWebKey
  delete publicKey.d
  publicKey.key_ops = ['verify']
  return importKey(btoa(JSON.stringify(publicKey)), 'publicKey')
}

const sign = async (data: string, privateKey: CryptoKey) => {
  const dataBuf = new TextEncoder().encode(data)
  const resBuf = await crypto.subtle.sign(
    keypairHashAlgorithm,
    privateKey,
    dataBuf,
  )
  return btoa(Array.from(new Uint8Array(resBuf)).join(','))
}

const verify = async (
  data: string,
  signature: string,
  publicKey: CryptoKey,
) => {
  const dataBuf = new TextEncoder().encode(data)
  const signBuf = new Uint8Array(
    atob(signature)
      .split(',')
      .map(byte => parseInt(byte, 10)),
  )
  return crypto.subtle.verify(keypairHashAlgorithm, publicKey, signBuf, dataBuf)
}

const encrypt = async (
  data: string,
  key: CryptoKey,
): Promise<[string, string]> => {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const dataBuf = new TextEncoder().encode(data)
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    dataBuf,
  )

  return [
    btoa(Array.from(new Uint8Array(encrypted)).join(',')),
    btoa(Array.from(iv).join(',')),
  ]
}

const decrypt = async (data: string, key: CryptoKey, iv: string) => {
  return new TextDecoder().decode(
    await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(
          atob(iv)
            .split(',')
            .map(byte => parseInt(byte, 10)),
        ),
      },
      key,
      new Uint8Array(
        atob(data)
          .split(',')
          .map(byte => parseInt(byte, 10)),
      ),
    ),
  )
}
export {
  decrypt,
  derivePublicKey,
  encrypt,
  exportKey,
  generateKeyPair,
  generateSymmetricKey,
  importKey,
  keypairGenAlgorithm,
  keypairHashAlgorithm,
  keypairProtectedHeader,
  keypairUsage,
  sign,
  symmetricGenAlgorithm,
  symmetricProtectedHeader,
  symmetricUsage,
  verify,
}
