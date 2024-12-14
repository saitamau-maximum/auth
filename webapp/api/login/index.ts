import { Hono } from 'hono'

import { HonoEnv } from '../../load-context'

import loginGithubRoute from './github'
import loginIndexRoute from './login'

const app = new Hono<HonoEnv>()

app.route('/', loginIndexRoute)
app.route('/github', loginGithubRoute)

export default app
