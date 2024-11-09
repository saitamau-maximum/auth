import { Hono } from 'hono'

import { HonoEnv } from '../../load-context'

import oauthAuthorizeRoute from './authorize'
import oauthCallbackRoute from './callback'

const app = new Hono<HonoEnv>()

app.route('/authorize', oauthAuthorizeRoute)
app.route('/callback', oauthCallbackRoute)

export default app
