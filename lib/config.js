'use strict'

const envSchema = require('env-schema')

const schema = {
  type: 'object',
  required: ['postalServer', 'postalKey'],
  properties: {
    postalServer: { type: 'string' },
    postalKey: { type: 'string' },
    postalSender: { type: 'string' }
  }
}

module.exports = opts =>
  envSchema({
    schema: schema,
    data: opts,
    dotenv: opts.useDotenv
  })
