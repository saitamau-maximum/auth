import type { MetaFunction } from '@remix-run/cloudflare'

export const meta: MetaFunction = () => {
  const TITLE = 'Maximum Auth'
  const DESCRIPTION = 'Aggregated Authentication Platform of Maximum'
  const IMAGE = 'https://auth.maximum.vc/ogp.webp'
  return [
    { title: TITLE },
    { name: 'robots', content: 'noindex, nofollow' },
    { name: 'description', content: DESCRIPTION },
    { name: 'og:title', content: TITLE },
    { name: 'og:description', content: DESCRIPTION },
    { name: 'og:image', content: IMAGE },
  ]
}

export default function Index() {
  return (
    <main>
      <h1>Maximum Auth</h1>
      <p>Aggregated Authentication Platform of Maximum</p>
      <p>認証が必要なサイトからアクセスしてください。</p>
    </main>
  )
}
