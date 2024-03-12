import { middleware } from './middleware'
import { getUserInfo } from './userinfo'
import { validateRequest } from './validate'

const getLoginURL = () => '/auth/login'
const getLogoutURL = () => '/auth/logout'

export { getLoginURL, getLogoutURL, getUserInfo, middleware, validateRequest }
