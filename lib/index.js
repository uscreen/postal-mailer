import configure from './config.js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import postal from './postal.js'
import smtp from './smtp.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const { name, version } = JSON.parse(readFileSync(path.join(__dirname, '../package.json'), 'utf8'))

const transports = { postal, smtp }

export default ({ opts }) => {
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
