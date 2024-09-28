import { parse as parseCookie } from 'cookie'
import { jwtVerify } from 'jose'

import { derivePublicKey, importKey, keypairProtectedHeader } from './internal'

interface Options {
  /**
   * Auth サーバの Origin
   * @default 'https://auth.maximum.vc'
   */
  authOrigin?: string
  /**
   * 認証に使用する名前
   * [saitamau-maximum/auth](https://github.com/saitamau-maximum/auth) に登録している名前を使用する
   */
  authName: string
  /**
   * 認証に使用する秘密鍵
   * [saitamau-maximum/auth](https://github.com/saitamau-maximum/auth) に登録している公開鍵と対応したものを使用する
   */
  privateKey: string
  /**
   * Dev mode
   */
  dev?: boolean
}

// 詳細は webapp/app/routes/continue/route.tsx
interface UserInfo {
  // webapp/utils/session.server.ts の SessionData
  id: string
  display_name: string
  profile_image: string
  teams: string[]
  is_member: boolean
}

const getUserInfo = async (
  request: Request,
  options: Options,
): Promise<UserInfo | null> => {
  for (const key of ['authName', 'privateKey'] as const) {
    if (!options[key]) {
      throw new Error(`options.${key} は必須です`)
    }
  }

  const cookie = parseCookie(request.headers.get('Cookie') || '')

  if (options.dev) {
    if (!cookie['__dev_logged_in']) return null

    const DUMMY_USERDATA: UserInfo = {
      id: '120705481',
      display_name: 'saitamau-maximum',
      is_member: true,
      profile_image: 'https://avatars.githubusercontent.com/u/120705481?v=4',
      teams: ['leaders'],
    }

    return DUMMY_USERDATA
  }

  const privateKey = await importKey(options.privateKey, 'privateKey')
  const publicKey = await derivePublicKey(privateKey)

  if (!cookie['token']) return null

  const { payload } = await jwtVerify<UserInfo>(cookie['token'], publicKey, {
    algorithms: [keypairProtectedHeader.alg],
    audience: options.authName,
    issuer: options.authName,
    subject: 'Maximum Auth Data',
    clockTolerance: 5,
  }).catch(() => ({ payload: null }))

  return payload
}

export { UserInfo, getUserInfo }
