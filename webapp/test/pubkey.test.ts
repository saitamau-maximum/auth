import { importKey } from '@saitamau-maximum/auth/internal'
import { expect, it } from 'vitest'

import data from '../data/pubkey.json'

it('has the correct schema', () => {
  expect(data).toBeTypeOf('object')
  expect(Array.isArray(data)).toBe(true)
  for (const item of data) {
    expect(item).toBeTypeOf('object')
    expect(item).toHaveProperty('name')
    expect(item).toHaveProperty('pubkey')
    expect(item.name).toBeTypeOf('string')
    expect(item.pubkey).toBeTypeOf('string')
  }
})

it('has the correct pubkey', async () => {
  for (const item of data) {
    await expect(importKey(item.pubkey, 'publicKey')).resolves.toBeDefined()
    await expect(importKey(item.pubkey, 'privateKey')).rejects.toThrow()
    await expect(importKey(item.pubkey, 'symmetric')).rejects.toThrow()
    const key = await importKey(item.pubkey, 'publicKey')
    expect(key.algorithm.name).toBe('ECDSA')
    expect(key.usages).toContain('verify')
  }
})
