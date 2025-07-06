const nock = require('nock')
const tap = require('tap')
const { build } = require('./helper')

const interceptor = require('./interceptor')

const clearMocks = () => {
  nock.cleanAll()
}

const postalMock = (app, returnCode = 200, additional) => {
  const replies = {
    200: {
      status: 'success',
      data: {
        messages: {
          KEY: {
            'id': 'ID',
            'token': 'TOKEN',
            'message-id': 'SOME_MSG_ID',
            'x-postal-msgid': 'SOME_POSTAL_MSG_ID'
          }
        }
      }
    }
  }

  return nock(`https://${app.postalOptions.postalServer}`)
    .post('/api/v1/send/message', interceptor.intercept(additional))
    .reply(returnCode, replies[returnCode])
}

const defaultPayload = () => ({
  template: 'test',
  data: {
    foo: 'bar'
  },
  to: 'foo@domain.com',
  subject: 'test',
  locale: 'en'
})

tap.test('sendmail: postal', async (t) => {
  const app = await build(t, { postalTransport: 'postal' })

  t.beforeEach(() => clearMocks)

  t.test('should send email', async (t) => {
    const mock = postalMock(app)

    const answer = await app.sendMail(defaultPayload())

    t.ok(mock.isDone(), 'should send message to postal')
    t.equal(answer.__pmtransport, 'postal', 'should indicate correct transport')
    t.ok(answer, 'should have an answer')
    t.ok(answer.client, 'answer should have client')
    t.ok(answer.result, 'answer should have result')
    t.ok(answer.result.messages, 'answer should have messages')
    t.ok(answer.result.messages.KEY, 'messages should have keyed value')
    t.ok(answer.result.messages.KEY['message-id'], 'should have a message id')
    t.ok(
      answer.result.messages.KEY['x-postal-msgid'],
      'should have a postal message id'
    )

    t.end()
  })

  t.test('should send email to cc and bcc', async (t) => {
    const mock = postalMock(app, 200, {
      cc: [['cc@domain.com']],
      bcc: [['bcc1@domain.com', 'bcc2@domain.com']]
    })

    const payload = defaultPayload()
    payload.cc = ['cc@domain.com']
    payload.bcc = ['bcc1@domain.com', 'bcc2@domain.com']

    const answer = await app.sendMail(payload)

    t.ok(mock.isDone(), 'should send message to postal')
    t.equal(answer.__pmtransport, 'postal', 'should indicate correct transport')
    t.ok(answer, 'should have an answer')
    t.ok(answer.client, 'answer should have client')
    t.ok(answer.result, 'answer should have result')
    t.ok(answer.result.messages, 'answer should have messages')
    t.ok(answer.result.messages.KEY, 'messages should have keyed value')
    t.ok(answer.result.messages.KEY['message-id'], 'should have a message id')
    t.ok(
      answer.result.messages.KEY['x-postal-msgid'],
      'should have a postal message id'
    )

    t.end()
  })

  t.test('should send from different sender', async (t) => {
    const mock = postalMock(app, 200, { from: 'test@somewhere.com' })

    const payload = defaultPayload()
    payload.from = 'test@somewhere.com'

    await app.sendMail(payload)
    t.ok(mock.isDone(), 'should send message to postal')

    t.end()
  })

  t.test(`should send with fallback locale`, async (t) => {
    const mock = postalMock(app, 200, (body) => {
      if (body.plain_body !== 'EN: bar' || !body.html_body.match(/EN: bar/)) { return false }

      return true
    })
    const payload = defaultPayload()
    delete payload.locale
    await app.sendMail(payload)
    t.ok(mock.isDone(), 'should send message to postal')

    t.end()
  })

  t.test(`should send with different locale`, async (t) => {
    const mock = postalMock(app, 200, (body) => {
      if (body.plain_body !== 'DE: bar' || !body.html_body.match(/DE: bar/)) { return false }

      return true
    })
    const payload = defaultPayload()
    payload.locale = 'de'
    await app.sendMail(payload)
    t.ok(mock.isDone(), 'should send message to postal')

    t.end()
  })

  t.test(`should fail without required properties`, async (t) => {
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

  t.test(`should send email with attachment`, async (t) => {
    const mock = postalMock(app)
    const payload = defaultPayload()
    payload.attachments = [
      { filename: 'test.jpg', contentType: 'image/jpg', data: '' }
    ]
    await app.sendMail(payload)
    t.ok(mock.isDone(), 'should send message to postal')

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
