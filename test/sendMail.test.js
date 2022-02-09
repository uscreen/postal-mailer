const tap = require('tap')

// const lib = require('../index')

const { build } = require('./helper')

tap.test('sendmail: smtp', async (t) => {
  const app = await build(t, { postalTransport: 'smtp' })
  const mailPayload = {
    template: 'test',
    data: {
      foo: 'bar'
    },
    to: 'foo@domain.com',
    subject: 'test'
  }

  t.beforeEach(() => app.mockedNodemailer.mock.reset())

  t.test('should send email', async (t) => {
    try {
      const result = await app.smtpMocked.sendMail(mailPayload)

      t.equal(
        result.response,
        'nodemailer-mock success',
        'should return success'
      )

      const sentMails = app.mockedNodemailer.mock.getSentMail()
      t.ok(sentMails.length, 'should have mail sent')

      const sentMail = sentMails[0]
      t.equal(
        sentMail.from,
        'mail@domain.com',
        'should send from mail@domain.com'
      )
      t.equal(sentMail.to, 'foo@domain.com', 'should send to foo@domain.com')
      t.equal(sentMail.subject, 'test', 'should send "test" as subject')
      t.ok(sentMail.html, 'should have html body')
      t.ok(
        sentMail.html.match(/TEMPLATE: bar/),
        'should have templating enabled'
      )
    } catch (error) {
      console.log('error', error)
    }
    t.end()
  })

  t.test('should send email with attachment', async (t) => {
    mailPayload.attachments = [
      { filename: 'test.jpg', contentType: 'image/jpg', data: '' }
    ]
    try {
      await app.smtpMocked.sendMail(mailPayload)
      const sentMails = app.mockedNodemailer.mock.getSentMail()
      const sentMail = sentMails[0]
      t.equal(sentMail.attachments.length, 1, 'should have one attachment')
    } catch (error) {
      console.log('error', error)
    }
    t.end()
  })
})
