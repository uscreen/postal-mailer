'use strict'

module.exports = ({ opts }) => {
  console.log('opts:', opts)

  return {
    name: 'mailer',
    opts
  }
}
