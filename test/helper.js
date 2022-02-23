'use strict'

const path = require('path')

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

  const { client, sendMail } = app(postalOptions)
  return { postalOptions, client, sendMail }
}

module.exports = {
  build
}
