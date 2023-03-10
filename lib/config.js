'use strict'

const path = require('path')
const envSchema = require('env-schema')

const schema = {
  type: 'object',
  required: ['postalTemplates', 'postalServer', 'postalKey'],
  properties: {
    postalTemplates: {
      type: 'string',
      default: path.join(process.cwd(), 'templates')
    },
    postalAssetsUrl: { type: 'string', default: '' },
    postalTransport: { enum: ['postal', 'smtp'], default: 'postal' },
    postalServer: { type: 'string' },
    postalPort: { type: 'number', default: 25 },
    postalUser: { type: 'string' },
    postalKey: { type: 'string' },
    postalSender: { type: 'string' },
    postalDefaultLocale: { type: 'string', default: '' }
  }
}

module.exports = (opts) =>
  envSchema({
    schema: schema,
    data: opts,
    dotenv: opts.useDotenv
  })
