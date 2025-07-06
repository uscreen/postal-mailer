'use strict'

const path = require('node:path')
const process = require('node:process')

const app = require('../index')

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

const build = async (t, options = {}) => {
  const postalOptions = { ...postalDefaults(), ...options }

  const { client, sendMail, compileHtmlBody, compilePlainBody } = app(postalOptions)
  return { postalOptions, client, sendMail, compileHtmlBody, compilePlainBody }
}

module.exports = {
  build
}
