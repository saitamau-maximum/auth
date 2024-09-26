import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { expect, it, vi } from 'vitest'

import { importKey, sign } from '../src/internal'
import { validateRequest } from '../src/validate'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault('Asia/Tokyo')

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

it("returns false if 'X-Maximum-Auth-Pubkey' is missing", async () => {
  const time = dayjs.tz().valueOf().toString()
  const rand = btoa(crypto.getRandomValues(new Uint8Array(16)).toString())
  const privkey = await importKey(TEST_PRIVKEY, 'privateKey')

  const header = new Headers()
  // header.set('X-Maximum-Auth-Pubkey',TEST_PUBKEY)
  header.set('X-Maximum-Auth-Time', time)
  header.set('X-Maximum-Auth-Key', rand)
  header.set('X-Maximum-Auth-Mac', await sign(`${time}___${rand}`, privkey))

  const res = await validateRequest(header, {
    proxyPubkey: TEST_PUBKEY,
  })
  expect(res).toBe(false)
})

it("returns false if 'X-Maximum-Auth-Time' is missing", async () => {
  const time = dayjs.tz().valueOf().toString()
  const rand = btoa(crypto.getRandomValues(new Uint8Array(16)).toString())
  const privkey = await importKey(TEST_PRIVKEY, 'privateKey')

  const header = new Headers()
  header.set('X-Maximum-Auth-Pubkey', TEST_PUBKEY)
  // header.set('X-Maximum-Auth-Time', time)
  header.set('X-Maximum-Auth-Key', rand)
  header.set('X-Maximum-Auth-Mac', await sign(`${time}___${rand}`, privkey))

  const res = await validateRequest(header, {
    proxyPubkey: TEST_PUBKEY,
  })
  expect(res).toBe(false)
})

it("returns false if 'X-Maximum-Auth-Key' is missing", async () => {
  const time = dayjs.tz().valueOf().toString()
  const rand = btoa(crypto.getRandomValues(new Uint8Array(16)).toString())
  const privkey = await importKey(TEST_PRIVKEY, 'privateKey')

  const header = new Headers()
  header.set('X-Maximum-Auth-Pubkey', TEST_PUBKEY)
  header.set('X-Maximum-Auth-Time', time)
  // header.set('X-Maximum-Auth-Key', rand)
  header.set('X-Maximum-Auth-Mac', await sign(`${time}___${rand}`, privkey))

  const res = await validateRequest(header, {
    proxyPubkey: TEST_PUBKEY,
  })
  expect(res).toBe(false)
})

it("returns false if 'X-Maximum-Auth-Mac' is missing", async () => {
  const time = dayjs.tz().valueOf().toString()
  const rand = btoa(crypto.getRandomValues(new Uint8Array(16)).toString())
  // const privkey = await importKey(TEST_PRIVKEY, 'privateKey')

  const header = new Headers()
  header.set('X-Maximum-Auth-Pubkey', TEST_PUBKEY)
  header.set('X-Maximum-Auth-Time', time)
  header.set('X-Maximum-Auth-Key', rand)
  // header.set('X-Maximum-Auth-Mac', await sign(`${time}___${rand}`, privkey))

  const res = await validateRequest(header, {
    proxyPubkey: TEST_PUBKEY,
  })
  expect(res).toBe(false)
})

it("returns false if 'X-Maximum-Auth-Pubkey' doesn't match proxyPubkey", async () => {
  const time = dayjs.tz().valueOf().toString()
  const rand = btoa(crypto.getRandomValues(new Uint8Array(16)).toString())
  const privkey = await importKey(TEST_PRIVKEY, 'privateKey')

  const header = new Headers()
  header.set('X-Maximum-Auth-Pubkey', TEST_PUBKEY)
  header.set('X-Maximum-Auth-Time', time)
  header.set('X-Maximum-Auth-Key', rand)
  header.set('X-Maximum-Auth-Mac', await sign(`${time}___${rand}`, privkey))

  const res = await validateRequest(header, {
    proxyPubkey: TEST_PUBKEY + 'hoge',
  })
  expect(res).toBe(false)
})

it('returns false if more than 15 secs have passed', async () => {
  const time = dayjs.tz().add(-16, 'second').valueOf().toString()
  const rand = btoa(crypto.getRandomValues(new Uint8Array(16)).toString())
  const privkey = await importKey(TEST_PRIVKEY, 'privateKey')

  const header = new Headers()
  header.set('X-Maximum-Auth-Pubkey', TEST_PUBKEY)
  header.set('X-Maximum-Auth-Time', time)
  header.set('X-Maximum-Auth-Key', rand)
  header.set('X-Maximum-Auth-Mac', await sign(`${time}___${rand}`, privkey))

  const res = await validateRequest(header, {
    proxyPubkey: TEST_PUBKEY,
  })
  expect(res).toBe(false)
})

it("returns false if the MAC doesn't match", async () => {
  const time = dayjs.tz().valueOf().toString()
  const rand = btoa(crypto.getRandomValues(new Uint8Array(16)).toString())
  const privkey = await importKey(TEST_PRIVKEY, 'privateKey')

  const header = new Headers()
  header.set('X-Maximum-Auth-Pubkey', TEST_PUBKEY)
  header.set('X-Maximum-Auth-Time', time)
  header.set('X-Maximum-Auth-Key', rand)
  header.set(
    'X-Maximum-Auth-Mac',
    await sign(`${time}___${rand}_hoge`, privkey),
  )

  const res = await validateRequest(header, {
    proxyPubkey: TEST_PUBKEY,
  })
  expect(res).toBe(false)
})

it('returns true if the all conditions match', async () => {
  const time = dayjs.tz().valueOf().toString()
  const rand = btoa(crypto.getRandomValues(new Uint8Array(16)).toString())
  const privkey = await importKey(TEST_PRIVKEY, 'privateKey')

  const header = new Headers()
  header.set('X-Maximum-Auth-Pubkey', TEST_PUBKEY)
  header.set('X-Maximum-Auth-Time', time)
  header.set('X-Maximum-Auth-Key', rand)
  header.set('X-Maximum-Auth-Mac', await sign(`${time}___${rand}`, privkey))

  const res = await validateRequest(header, {
    proxyPubkey: TEST_PUBKEY,
  })
  expect(res).toBe(true)
})

it('fallbacks to PROXY_PUBKEY if proxyPubkey is not provided', async () => {
  const time = dayjs.tz().valueOf().toString()
  const rand = btoa(crypto.getRandomValues(new Uint8Array(16)).toString())
  const privkey = await importKey(TEST_PROXYPRIVKEY, 'privateKey')
  const pubkey =
    'eyJrdHkiOiJFQyIsImtleV9vcHMiOlsidmVyaWZ5Il0sImV4dCI6dHJ1ZSwiY3J2IjoiUC01MjEiLCJ4IjoiQVB0MUFSd253eU82WGZEcWFNNFU2SGRRSnlDTUdnUk5wQkwxSXdjdmRfdVRNc3NqMmRCT3VDakFKQ1BRc2VFdVl5blZXdXN6Yi1UM2REQ29ROTlyeVo2NSIsInkiOiJBRjZHd19weTRrZ0xzRUQ2bHlWOVlEd0tTZm1saHQtUHFqSjZ2cXZxZlNmRnhHVG9VR3ZGOHk0OVByclowS3dlM213MFB1cFRHQ0dpLXl5UFpCd1pGenRJIn0='

  const header = new Headers()
  header.set('X-Maximum-Auth-Pubkey', pubkey)
  header.set('X-Maximum-Auth-Time', time)
  header.set('X-Maximum-Auth-Key', rand)
  header.set('X-Maximum-Auth-Mac', await sign(`${time}___${rand}`, privkey))

  const res = await validateRequest(header)
  expect(res).toBe(true)
})
