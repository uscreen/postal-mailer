import path from 'node:path'
import process from 'node:process'
import app from '../index.js'

const postalDefaults = () => ({
  postalTemplates: path.join(process.cwd(), 'test/templates'),
  postalServer: process.env.postalServer || 'localhost',
  postalPort: 1025,
  postalUser: 'someUser',
  postalKey: 'someKey',
  postalSender: 'mail@domain.com',
  postalTransport: 'smtp',
  postalDefaultLocale: 'en'
})

const build = async (options = {}) => {
  const postalOptions = { ...postalDefaults(), ...options }

  const { client, sendMail, compileHtmlBody, compilePlainBody } = app(postalOptions)
  return { postalOptions, client, sendMail, compileHtmlBody, compilePlainBody }
}

export {
  build
}
