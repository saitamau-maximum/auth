import type { MetaFunction } from '@remix-run/cloudflare'

export const meta: MetaFunction = () => {
  return [
    { title: 'Maximum Auth' },
    { name: 'robots', content: 'noindex, nofollow' },
  ]
}

export default function Index() {
  return (
    <>
      <p>🚧 WIP</p>
    </>
  )
}
