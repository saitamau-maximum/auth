const getLoginURL = () => '/auth/login'
const getLogoutURL = () => '/auth/logout'

export {
  decrypt,
  derivePublicKey,
  encrypt,
  exportKey,
  generateKeyPair,
  generateSymmetricKey,
  importKey,
  keypairGenAlgorithm,
  keypairHashAlgorithm,
  keypairUsage,
  sign,
  symmetricGenAlgorithm,
  symmetricUsage,
  verify,
} from './keygen'
export { generateGoParam, verifyMac } from './goparam'
export { generateToken, verifyToken } from './tokengen'
export { getLoginURL, getLogoutURL }
export { getUserInfo } from './userinfo'
export { middleware } from './middleware'
export { validateRequest } from './validate'
