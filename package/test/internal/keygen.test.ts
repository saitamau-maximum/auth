import { describe, expect, it } from 'vitest'

import {
  derivePublicKey,
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
} from '../../src/internal/keygen'

describe('algorithm & usage', () => {
  it('uses the correct keypair algorithm', () => {
    expect(keypairGenAlgorithm.name).toBe('ECDSA')
    expect(keypairGenAlgorithm.namedCurve).toBe('P-521')
  })

  it('uses the correct keypair hash algorithm', () => {
    expect(keypairHashAlgorithm.name).toBe('ECDSA')
    expect(keypairHashAlgorithm.hash).toBe('SHA-512')
  })

  it('uses the correct symmetric algorithm', () => {
    expect(symmetricGenAlgorithm.name).toBe('AES-GCM')
    expect(symmetricGenAlgorithm.length).toBe(256)
  })

  it('uses the correct keypair usage', () => {
    expect(keypairUsage).toEqual(['sign', 'verify'])
  })

  it('uses the correct symmetric usage', () => {
    expect(symmetricUsage).toEqual(['encrypt', 'decrypt'])
  })
})

describe('generating key pair', () => {
  it('generates a key pair', async () => {
    const keypair = await generateKeyPair()
    expect(keypair.privateKey).toBeInstanceOf(CryptoKey)
    expect(keypair.publicKey).toBeInstanceOf(CryptoKey)
  })

  it('generates a key pair with the correct algorithm', async () => {
    const keypair = await generateKeyPair()
    expect(keypair.privateKey.algorithm).toEqual(keypairGenAlgorithm)
    expect(keypair.publicKey.algorithm).toEqual(keypairGenAlgorithm)
  })

  it('generates a key pair with the correct usage', async () => {
    const keypair = await generateKeyPair()
    expect(keypair.privateKey.usages).toEqual(['sign'])
    expect(keypair.publicKey.usages).toEqual(['verify'])
  })

  it('can export and import a key pair', async () => {
    const keypair = await generateKeyPair()
    const exportedPrivkey = await exportKey(keypair.privateKey)
    const exportedPubkey = await exportKey(keypair.publicKey)
    const importedPrivkey = await importKey(exportedPrivkey, 'privateKey')
    const importedPubkey = await importKey(exportedPubkey, 'publicKey')
    // なぜか keypair.privateKey と importedPrivkey が等しくならないので
    expect(await exportKey(importedPrivkey)).toBe(exportedPrivkey)
    expect(await exportKey(importedPubkey)).toBe(exportedPubkey)
  })

  it('can derive a public key from a private key', async () => {
    const keypair = await generateKeyPair()
    const exportedPubKey = await exportKey(keypair.publicKey)
    const derivedPubKey = await exportKey(
      await derivePublicKey(keypair.privateKey),
    )
    expect(exportedPubKey).toBe(derivedPubKey)
  })
})

describe('generating symmetric key', () => {
  it('generates a symmetric key', async () => {
    const key = await generateSymmetricKey()
    expect(key).toBeInstanceOf(CryptoKey)
  })

  it('generates a symmetric key with the correct algorithm', async () => {
    const key = await generateSymmetricKey()
    expect(key.algorithm).toEqual(symmetricGenAlgorithm)
  })

  it('generates a symmetric key with the correct usage', async () => {
    const key = await generateSymmetricKey()
    expect(key.usages).toEqual(symmetricUsage)
  })

  it('can export and import a symmetric key', async () => {
    const key = await generateSymmetricKey()
    const exportedKey = await exportKey(key)
    const importedKey = await importKey(exportedKey, 'symmetric')
    expect(await exportKey(importedKey)).toBe(exportedKey)
  })

  it('can export and import a symmetric key', async () => {
    const key = await generateSymmetricKey()
    const exportedKey = await exportKey(key)
    const importedKey = await importKey(exportedKey, 'symmetric')
    expect(await exportKey(importedKey)).toBe(exportedKey)
  })
})

describe('using the keys', () => {
  it('can sign and verify a message', async () => {
    const keypair = await generateKeyPair()
    const signature = await sign('Hello, world!', keypair.privateKey)
    const verified = await verify('Hello, world!', signature, keypair.publicKey)
    expect(verified).toBe(true)
  })
})
