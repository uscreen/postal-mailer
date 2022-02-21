'use strict'

const path = require('path')

const nodemailer = require('nodemailer')
const nodemailerMock = require('nodemailer-mock')
class postalClientMock {
  constructor(config, key) {
    console.log('in constructor')
  }
}

const postal = require('../lib/postal')

class postalSendMessageMock {
  constructor(config, key) {
    console.log('postalSendMessageMock', config, key)
    return {
      from: (from) => {
        console.log('from', from)
      },
      to: () => {},
      subject: () => {},
      htmlBody: () => {},
      plainBody: () => {},
      cc: () => {},
      bcc: () => {},
      attach: () => {},
      send: () => {}
    }
  }
}

const postalDefaults = () => ({
  postalTemplates: path.join(process.cwd(), 'test/templates'),
  postalServer: 'postal.uscreen.me',
  postalPort: 2525,
  postalUser: 'someUser',
  postalKey: 'someKey',
  postalSender: 'mail@domain.com',
  postalTransport: 'smtp',
  postalDefaultLocale: ''
})

const build = async (t, options = {}) => {
  const postalOptions = { ...postalDefaults(), ...options }

  if (options.postalTransport === 'smtp') {
    const mockedNodemailer = nodemailerMock.getMockFor(nodemailer)
    const smtpMock = t.mock('../index', {
      nodemailer: mockedNodemailer,
      '@atech/postal': {
        Client: postalClientMock,
        SendMessage: postalSendMessageMock
      }
    })

    const smtpMocked = smtpMock(postalOptions)

    return { smtpMocked, mockedNodemailer }
  }

  const { client, sendMail } = postal(postalOptions)
  return { postalOptions, client, sendMail }
}

module.exports = {
  build
}
