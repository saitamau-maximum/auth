const keypairGenAlgorithm: EcKeyGenParams = {
  name: 'ECDSA',
  namedCurve: 'P-521',
}
const keypairHashAlgorithm: EcdsaParams = {
  name: 'ECDSA',
  hash: 'SHA-512',
}
const keypairUsage: KeyUsage[] = ['sign', 'verify']

const symmetricGenAlgorithm: AesKeyGenParams = {
  name: 'AES-GCM',
  length: 256,
}
const symmetricUsage: KeyUsage[] = ['encrypt', 'decrypt']

const generateKeyPair = () =>
  crypto.subtle.generateKey(keypairGenAlgorithm, true, keypairUsage)

const generateSymmetricKey = () =>
  crypto.subtle.generateKey(symmetricGenAlgorithm, true, symmetricUsage)

const exportKey = async (key: CryptoKey) => {
  const exportedKey = await crypto.subtle.exportKey('jwk', key)
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
  } else {
    return crypto.subtle.importKey(
      'jwk',
      keyData,
      keypairGenAlgorithm,
      true,
      type === 'publicKey' ? ['verify'] : ['sign'],
    )
  }
}

const sign = async (data: BufferSource, privateKey: CryptoKey) => {
  return crypto.subtle.sign(keypairHashAlgorithm, privateKey, data)
}

const verify = async (
  data: BufferSource,
  signature: ArrayBuffer,
  publicKey: CryptoKey,
) => {
  return crypto.subtle.verify(keypairHashAlgorithm, publicKey, signature, data)
}

const encrypt = async (data: BufferSource, key: CryptoKey) => {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  return [
    await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      data,
    ),
    btoa(Array.from(iv).join(',')),
  ] as [ArrayBuffer, string]
}

const decrypt = async (data: BufferSource, key: CryptoKey, iv: string) => {
  return crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(
        atob(iv)
          .split(',')
          .map(byte => parseInt(byte, 10)),
      ),
    },
    key,
    data,
  )
}

export {
  decrypt,
  encrypt,
  exportKey,
  generateKeyPair,
  generateSymmetricKey,
  importKey,
  keypairGenAlgorithm,
  keypairHashAlgorithm,
  keypairUsage,
  sign,
  symmetricGenAlgorithm,
  symmetricUsage,
  verify,
}
