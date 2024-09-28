// jsdom だと TextEncoder と Uint8Array の互換性がないみたいなので node でテストする (挙動は同じ...はず)
// https://github.com/vitest-dev/vitest/issues/4043
// @vitest-environment node

import { SignJWT } from 'jose'
import { expect, it, vi } from 'vitest'

import { importKey, keypairProtectedHeader } from '../src/internal'
import { validateRequest } from '../src/validate'

vi.mock('../src/internal', async importOriginal => {
  const mod = await importOriginal<typeof import('../src/internal')>()
  return {
    ...mod,
    PROXY_PUBKEY:
      'eyJrdHkiOiJFQyIsImtleV9vcHMiOlsidmVyaWZ5Il0sImV4dCI6dHJ1ZSwiY3J2IjoiUC01MjEiLCJ4IjoiQVB0MUFSd253eU82WGZEcWFNNFU2SGRRSnlDTUdnUk5wQkwxSXdjdmRfdVRNc3NqMmRCT3VDakFKQ1BRc2VFdVl5blZXdXN6Yi1UM2REQ29ROTlyeVo2NSIsInkiOiJBRjZHd19weTRrZ0xzRUQ2bHlWOVlEd0tTZm1saHQtUHFqSjZ2cXZxZlNmRnhHVG9VR3ZGOHk0OVByclowS3dlM213MFB1cFRHQ0dpLXl5UFpCd1pGenRJIn0=',
  }
})

const TEST_PROXYPRIVKEY =
  'eyJrdHkiOiJFQyIsImtleV9vcHMiOlsic2lnbiJdLCJleHQiOnRydWUsImNydiI6IlAtNTIxIiwieCI6IkFQdDFBUndud3lPNlhmRHFhTTRVNkhkUUp5Q01HZ1JOcEJMMUl3Y3ZkX3VUTXNzajJkQk91Q2pBSkNQUXNlRXVZeW5WV3VzemItVDNkRENvUTk5cnlaNjUiLCJ5IjoiQUY2R3dfcHk0a2dMc0VENmx5VjlZRHdLU2ZtbGh0LVBxako2dnF2cWZTZkZ4R1RvVUd2Rjh5NDlQcnJaMEt3ZTNtdzBQdXBUR0NHaS15eVBaQndaRnp0SSIsImQiOiJBYU9pNUVtNUM5X0dTT0E5bjV0cEFQLUdCcUFxUDFucU1Bd3ROVUpPSzVwWjNpX09ZVjV5b3RTNnk2ZWRrbWlYMURQVVFDVmVzX3FnU3dKUWhXb2M5XzB0In0='

const TEST_PUBKEY =
  'eyJrdHkiOiJFQyIsImtleV9vcHMiOlsidmVyaWZ5Il0sImV4dCI6dHJ1ZSwiY3J2IjoiUC01MjEiLCJ4IjoiQWJpRUV5QTFGTVhmRklWN0p4c0hUVzJlQXNTX1llZ0hvQlp0R2xaaGRfSXZVSzJmay16RC14dEhmYUFESnFyNXViTEw2eWItTUtLZHktNUhvRnVSNEN1dSIsInkiOiJBZXRiLUhDY19IbGhScUYxT0pHUmlYMS15aWk5SUhzazFJT252dXF6OXlPVFlsOGpSLXNTNHpEaUd6ODBJWHJ2Qm1zTzVPRHZpYWxYN1E5enJ5MHFlS0lkIn0='

const TEST_PRIVKEY =
  'eyJrdHkiOiJFQyIsImtleV9vcHMiOlsic2lnbiJdLCJleHQiOnRydWUsImNydiI6IlAtNTIxIiwieCI6IkFiaUVFeUExRk1YZkZJVjdKeHNIVFcyZUFzU19ZZWdIb0JadEdsWmhkX0l2VUsyZmstekQteHRIZmFBREpxcjV1YkxMNnliLU1LS2R5LTVIb0Z1UjRDdXUiLCJ5IjoiQWV0Yi1IQ2NfSGxoUnFGMU9KR1JpWDEteWlpOUlIc2sxSU9udnVxejl5T1RZbDhqUi1zUzR6RGlHejgwSVhydkJtc081T0R2aWFsWDdROXpyeTBxZUtJZCIsImQiOiJBRjgtRHJSbmFabjhkRVppV2ozR2owY3F3VWlWNFp3NmhyX2EyT1FfbzMxQmVVNUc3RXhpQmV1dzcyemx5RVlCMGpXTWZKYUZzeUVhdU50UmFKY045cFJNIn0='

const generateToken = async ({
  subject = 'Maximum Auth Proxy',
  issuer = 'maximum-auth-proxy',
  exp = '5 sec',
  privateKey,
}: {
  subject?: string
  issuer?: string
  exp?: string
  privateKey: CryptoKey
}) => {
  let jwt = new SignJWT({})
    .setNotBefore('0 sec')
    .setIssuedAt()
    .setProtectedHeader(keypairProtectedHeader)
  if (subject) jwt = jwt.setSubject(subject)
  if (issuer) jwt = jwt.setIssuer(issuer)
  if (exp) jwt = jwt.setExpirationTime(exp)
  return await jwt.sign(privateKey)
}

it("returns false if 'X-Maximum-Auth-Pubkey' is missing", async () => {
  const privateKey = await importKey(TEST_PRIVKEY, 'privateKey')
  const token = await generateToken({ privateKey })

  const header = new Headers()
  // header.set('X-Maximum-Auth-Pubkey',TEST_PUBKEY)
  header.set('X-Maximum-Auth-Token', token)

  const res = await validateRequest(header, {
    proxyPubkey: TEST_PUBKEY,
  })
  expect(res).toBe(false)
})

it("returns false if 'X-Maximum-Auth-Token' is missing", async () => {
  // const privateKey = await importKey(TEST_PRIVKEY, 'privateKey')
  // const token = await generateToken({ privateKey})

  const header = new Headers()
  header.set('X-Maximum-Auth-Pubkey', TEST_PUBKEY)
  // header.set('X-Maximum-Auth-Token', token)

  const res = await validateRequest(header, {
    proxyPubkey: TEST_PUBKEY,
  })
  expect(res).toBe(false)
})

it("returns false if 'X-Maximum-Auth-Pubkey' doesn't match proxyPubkey", async () => {
  const privateKey = await importKey(TEST_PRIVKEY, 'privateKey')
  const token = await generateToken({ privateKey })

  const header = new Headers()
  header.set('X-Maximum-Auth-Pubkey', TEST_PUBKEY)
  header.set('X-Maximum-Auth-Token', token)

  const res = await validateRequest(header, {
    proxyPubkey: TEST_PUBKEY + 'hoge',
  })
  expect(res).toBe(false)
})

it("returns false if issuer doesn't match", async () => {
  const privateKey = await importKey(TEST_PRIVKEY, 'privateKey')
  const token = await generateToken({ privateKey, issuer: 'test' })

  const header = new Headers()
  header.set('X-Maximum-Auth-Pubkey', TEST_PUBKEY)
  header.set('X-Maximum-Auth-Token', token)

  const res = await validateRequest(header, {
    proxyPubkey: TEST_PUBKEY,
  })
  expect(res).toBe(false)
})

it("returns false if subject doesn't match", async () => {
  const privateKey = await importKey(TEST_PRIVKEY, 'privateKey')
  const token = await generateToken({ privateKey, subject: 'test' })

  const header = new Headers()
  header.set('X-Maximum-Auth-Pubkey', TEST_PUBKEY)
  header.set('X-Maximum-Auth-Token', token)

  const res = await validateRequest(header, {
    proxyPubkey: TEST_PUBKEY,
  })
  expect(res).toBe(false)
})

it('returns false if token expired', async () => {
  const privateKey = await importKey(TEST_PRIVKEY, 'privateKey')
  const token = await generateToken({ privateKey, exp: '1 sec' })

  const header = new Headers()
  header.set('X-Maximum-Auth-Pubkey', TEST_PUBKEY)
  header.set('X-Maximum-Auth-Token', token)

  // tolerance 5 sec + 1 sec -> 余裕もって 7 秒待つ
  await new Promise(resolve => setTimeout(resolve, 7000))

  const res = await validateRequest(header, {
    proxyPubkey: TEST_PUBKEY,
  })
  expect(res).toBe(false)
}, 10000)

it('fallbacks to PROXY_PUBKEY if proxyPubkey is not provided', async () => {
  const privateKey = await importKey(TEST_PROXYPRIVKEY, 'privateKey')
  const token = await generateToken({ privateKey })
  const pubkey =
    'eyJrdHkiOiJFQyIsImtleV9vcHMiOlsidmVyaWZ5Il0sImV4dCI6dHJ1ZSwiY3J2IjoiUC01MjEiLCJ4IjoiQVB0MUFSd253eU82WGZEcWFNNFU2SGRRSnlDTUdnUk5wQkwxSXdjdmRfdVRNc3NqMmRCT3VDakFKQ1BRc2VFdVl5blZXdXN6Yi1UM2REQ29ROTlyeVo2NSIsInkiOiJBRjZHd19weTRrZ0xzRUQ2bHlWOVlEd0tTZm1saHQtUHFqSjZ2cXZxZlNmRnhHVG9VR3ZGOHk0OVByclowS3dlM213MFB1cFRHQ0dpLXl5UFpCd1pGenRJIn0='

  const header = new Headers()
  header.set('X-Maximum-Auth-Pubkey', pubkey)
  header.set('X-Maximum-Auth-Token', token)

  const res = await validateRequest(header)
  expect(res).toBe(true)
})
