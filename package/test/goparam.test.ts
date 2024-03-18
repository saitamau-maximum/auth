import { describe, expect, it } from 'vitest'

import { generateGoParam, verifyMac } from '../src/goparam'
import { generateKeyPair } from '../src/keygen'

describe('correctly works', () => {
  const getRandomString = () => Math.random().toString(36).substring(7)

  it('generates a go param', async () => {
    const name = getRandomString()
    const pubkey = getRandomString()
    const callback = getRandomString()
    const token = getRandomString()
    const iv = getRandomString()
    const { privateKey } = await generateKeyPair()
    const result = await generateGoParam(
      name,
      pubkey,
      callback,
      token,
      iv,
      privateKey,
    )
    expect(result).toBeTypeOf('string')
  })

  it('verifies a go param', async () => {
    const name = getRandomString()
    const pubkey = getRandomString()
    const callback = getRandomString()
    const token = getRandomString()
    const iv = getRandomString()
    const { privateKey, publicKey } = await generateKeyPair()
    const mac = new URLSearchParams(
      await generateGoParam(name, pubkey, callback, token, iv, privateKey),
    ).get('mac')
    expect(mac).not.toBe(null)
    const result = await verifyMac(
      name,
      pubkey,
      callback,
      token,
      iv,
      mac!,
      publicKey,
    )
    expect(result).toBe(true)
  })

  it('verifies a go param with wrong mac', async () => {
    const name = getRandomString()
    const pubkey = getRandomString()
    const callback = getRandomString()
    const token = getRandomString()
    const iv = getRandomString()
    const { privateKey, publicKey } = await generateKeyPair()
    const mac =
      new URLSearchParams(
        await generateGoParam(name, pubkey, callback, token, iv, privateKey),
      ).get('mac') + 'a'
    const result = await verifyMac(
      name,
      pubkey,
      callback,
      token,
      iv,
      mac,
      publicKey,
    )
    expect(result).toBe(false)
  })
})
