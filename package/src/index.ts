const getLoginURL = () => '/auth/login'
const getLogoutURL = () => '/auth/logout'

export { getLoginURL, getLogoutURL }
export { getUserInfo } from './userinfo'
export { middleware } from './middleware'
export { validateRequest } from './validate'
