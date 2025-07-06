const mailhog = require('mailhog')

const tap = require('tap')

const { build } = require('./helper')

const defaultPayload = () => ({
  template: 'test',
  data: {
    foo: 'bar'
  },
  to: 'foo@domain.com',
  subject: 'test',
  locale: 'de'
})

tap.test('sendmail: smtp', async (t) => {
  const app = await build(t, { postalTransport: 'smtp' })
  const mhClient = mailhog({ host: app.postalOptions.postalServer })

  t.beforeEach(async () => await mhClient.deleteAll())

  t.test('should send email', async (t) => {
    try {
      const payload = defaultPayload()
      const result = await app.sendMail(payload)
      t.ok(result, 'should have result')
      t.equal(
        result.accepted.length,
        1,
        'should have accepted all mail addresses'
      )

      t.ok(result.messageId, 'should have message id')
      t.equal(result.__pmtransport, 'smtp', 'should use smtp as transport')

      const messages = await mhClient.messages()

      t.equal(messages.total, 1, 'should have 1 mail sent')

      const sentMail = messages.items[0]

      t.equal(
        sentMail.from,
        'mail@domain.com',
        'should send from mail@domain.com'
      )
      t.equal(sentMail.to, 'foo@domain.com', 'should send to foo@domain.com')
      t.equal(sentMail.subject, 'test', 'should send "test" as subject')
      t.ok(
        sentMail.html && sentMail.html.match(/DE: bar/),
        'should have html body and templating enabled'
      )
      t.ok(sentMail.text === 'DE: bar', 'should have plain text')
    }
    catch (error) {
      console.log('error', error)
    }
    t.end()
  })

  t.test('should send to cc', async (t) => {
    try {
      const payload = defaultPayload()
      payload.cc = ['cc@domain.com']
      const result = await app.sendMail(payload)
      t.ok(result, 'should have result')
      t.equal(
        result.accepted.length,
        2,
        'should have accepted all mail addresses'
      )

      const messages = await mhClient.messages()
      t.equal(messages.total, 1, 'should have 1 mail sent')

      const message = messages.items[0]
      t.equal(
        message.from,
        'mail@domain.com',
        'should send from mail@domain.com'
      )
      t.equal(message.cc, 'cc@domain.com', 'should send CC to cc@domain.com')
    }
    catch (error) {
      console.log('error', error)
    }
  })

  t.test('should send to bcc', async (t) => {
    try {
      const payload = defaultPayload()
      payload.bcc = ['bcc1@domain.com', 'bcc2@domain.com']
      const result = await app.sendMail(payload)
      t.ok(result, 'should have result')
      t.equal(
        result.accepted.length,
        3,
        'should have accepted all mail addresses'
      )

      const messages = await mhClient.messages()
      t.equal(messages.total, 1, 'should have 1 mail sent')

      const message = messages.items[0]
      payload.bcc.forEach((addr) => {
        t.ok(message.Raw.To.includes(addr), `should send BCC to ${addr}`)
      })
    }
    catch (error) {
      console.log('error', error)
    }
  })

  t.test('should send from different sender', async (t) => {
    try {
      const payload = defaultPayload()
      payload.from = 'test@somewhere.com'
      const result = await app.sendMail(payload)

      t.ok(result, 'should have result')

      const messages = await mhClient.messages()
      t.equal(messages.total, 1, 'should have 1 mail sent')
      const message = messages.items[0]
      t.equal(
        message.from,
        'test@somewhere.com',
        'should send from test@somewhere.com'
      )
    }
    catch (error) {
      console.log('error', error)
    }
    t.end()
  })

  t.test('should send with default locale', async (t) => {
    try {
      const payload = defaultPayload()
      delete payload.locale
      const result = await app.sendMail(payload)

      t.ok(result, 'should have result')

      const messages = await mhClient.messages()
      t.equal(messages.total, 1, 'should have 1 mail sent')

      const message = messages.items[0]
      t.ok(message.text === 'EN: bar', 'should return English text')
    }
    catch (error) {
      console.log('error', error)
    }
    t.end()
  })

  t.test('should send email with attachment', async (t) => {
    const payload = defaultPayload()
    payload.attachments = [
      { filename: 'test.jpg', contentType: 'image/jpg', data: '' }
    ]
    try {
      const result = await app.sendMail(payload)
      t.ok(result, 'should have result')

      const messages = await mhClient.messages()
      t.equal(messages.total, 1, 'should have 1 mail sent')
      const message = messages.items[0]
      t.ok(
        message.Content.Body.includes('Content-Type: image/jpg; name=test.jpg'),
        'should have attachment included'
      )
    }
    catch (error) {
      console.log('error', error)
    }
    t.end()
  })

  t.test('should fail without required properties', async (t) => {
    const props = ['template', 'data', 'to', 'subject']
    for (const prop of props) {
      const payload = defaultPayload()
      delete payload[prop]
      try {
        await app.sendMail(payload)
      }
      catch (error) {
        t.ok(
          error && error.code === 'ERR_ASSERTION' && error.operator === '==',
          `should fail on missing property ${prop}`
        )
      }
    }
    t.end()
  })

  t.test('should fail on invalid attachment data', async (t) => {
    const payload = defaultPayload()
    payload.attachments = [
      { filename: 'test.jpg', contentType: 'image/jpg', data: {} }
    ]
    try {
      await app.sendMail(payload)
    }
    catch (error) {
      t.ok(
        error && error.code === 'ERR_ASSERTION' && error.operator === '==',
        `should fail on invalid attachment data`
      )
    }
    t.end()
  })

  t.test('should fail on invalid attachment filename', async (t) => {
    const payload = defaultPayload()
    payload.attachments = [
      { filename: null, contentType: 'image/jpg', data: '' }
    ]
    try {
      await app.sendMail(payload)
    }
    catch (error) {
      t.ok(
        error && error.code === 'ERR_ASSERTION' && error.operator === '==',
        `should fail on invalid attachment data`
      )
    }
    t.end()
  })
})
