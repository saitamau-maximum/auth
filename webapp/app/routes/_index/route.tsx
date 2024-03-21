import type { MetaFunction } from '@remix-run/cloudflare'

export const meta: MetaFunction = () => {
  return [
    { title: 'Maximum Auth' },
    { name: 'robots', content: 'noindex, nofollow' },
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
