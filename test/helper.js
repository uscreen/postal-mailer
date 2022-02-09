'use strict'

const path = require('path')

const nodemailer = require('nodemailer')
const nodemailerMock = require('nodemailer-mock')

class postalClientMock {
  constructor(config, key) {
    console.log('in constructor')
  }
}

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
  postalServer: '127.0.0.1',
  postalPort: 2525,
  postalUser: 'someUser',
  postalKey: 'someKey',
  postalSender: 'mail@domain.com',
  postalTransport: 'smtp'
})

const build = async (t, options = {}) => {
  const mockedNodemailer = nodemailerMock.getMockFor(nodemailer)
  const smtpMock = t.mock('../index', {
    nodemailer: mockedNodemailer,
    '@atech/postal': {
      Client: postalClientMock,
      SendMessage: postalSendMessageMock
    }
  })

  const postalOptions = { ...postalDefaults(), ...options }

  const smtpMocked = smtpMock(postalOptions)

  const app = { smtpMocked, mockedNodemailer }

  return app
}

module.exports = {
  build
}
