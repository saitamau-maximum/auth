import {
  vitePlugin as remix,
  cloudflareDevProxyVitePlugin as remixCloudflareDevProxy,
} from '@remix-run/dev'

import adapter from '@hono/vite-dev-server/cloudflare'
import serverAdapter from 'hono-remix-adapter/vite'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    remixCloudflareDevProxy(),
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_lazyRouteDiscovery: true,
      },
    }),
    serverAdapter({
      entry: 'api/index.ts',
      adapter,
    }),
    tsconfigPaths(),
  ],
})
