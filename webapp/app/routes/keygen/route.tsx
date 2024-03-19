import type { MetaFunction } from '@remix-run/cloudflare'
import { json } from '@remix-run/cloudflare'
import { useLoaderData } from '@remix-run/react'

import {
  exportKey,
  generateKeyPair,
  generateSymmetricKey,
} from '@saitamau-maximum/auth/internal'

import style from './style.module.css'

export const loader = async () => {
  const key = await generateKeyPair()
  const pubkey = await exportKey(key.publicKey)
  const privkey = await exportKey(key.privateKey)
  const symkey = await exportKey(await generateSymmetricKey())
  return json({ pubkey, privkey, symkey })
}

export const meta: MetaFunction = () => {
  return [
    { title: 'Key Generator - Maximum Auth' },
    { name: 'robots', content: 'noindex, nofollow' },
  ]
}

export default function Keygen() {
  const data = useLoaderData<typeof loader>()

  return (
    <>
      <h1>Key Generator</h1>
      <p>
        Maximum Auth
        向けの公開鍵・秘密鍵を生成します。再読み込みすると新しく生成されます。
      </p>
      <p>
        秘密鍵は環境変数に置くなどして公開しないようにしてください。公開鍵は
        saitamau-maximum/auth で必要となるため PR を提出してください。
      </p>
      <h2>Generated Key:</h2>
      <h3>Public Key</h3>
      <pre className={style.pre}>{data.pubkey}</pre>
      <h3>Private Key</h3>
      <pre className={style.pre}>{data.privkey}</pre>
      <h3>Symmetric Key</h3>
      <pre className={style.pre}>{data.symkey}</pre>
    </>
  )
}
