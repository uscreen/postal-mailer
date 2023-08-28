'use strict'

const configure = require('./config')
const { name, version } = require('../package.json')

const postal = require('./postal')
const smtp = require('./smtp')

const transports = { postal, smtp }

module.exports = ({ opts }) => {
  /**
   * verify config options
   */
  const config = configure(opts)

  const { client, sendMail, compileHtmlBody, compilePlainBody } =
    transports[config.postalTransport](config)

  return {
    name,
    version,
    client,
    sendMail,
    compileHtmlBody,
    compilePlainBody
  }
}
