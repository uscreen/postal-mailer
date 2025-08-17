import nock from 'nock'
import { test, beforeEach, describe } from 'node:test'
import assert from 'node:assert'
import { build } from './helper.js'
import { intercept } from './interceptor.js'

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
    .post('/api/v1/send/message', intercept(additional))
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

describe('sendmail: postal', () => {
  let app

  beforeEach(async () => {
    app = await build({ postalTransport: 'postal' })
    clearMocks()
  })

  test('should send email', async () => {
    const mock = postalMock(app)

    const answer = await app.sendMail(defaultPayload())

    assert.ok(mock.isDone(), 'should send message to postal')
    assert.strictEqual(answer.__pmtransport, 'postal', 'should indicate correct transport')
    assert.ok(answer, 'should have an answer')
    assert.ok(answer.client, 'answer should have client')
    assert.ok(answer.result, 'answer should have result')
    assert.ok(answer.result.messages, 'answer should have messages')
    assert.ok(answer.result.messages.KEY, 'messages should have keyed value')
    assert.ok(answer.result.messages.KEY['message-id'], 'should have a message id')
    assert.ok(
      answer.result.messages.KEY['x-postal-msgid'],
      'should have a postal message id'
    )
  })

  test('should send email to cc and bcc', async () => {
    const mock = postalMock(app, 200, {
      cc: [['cc@domain.com']],
      bcc: [['bcc1@domain.com', 'bcc2@domain.com']]
    })

    const payload = defaultPayload()
    payload.cc = ['cc@domain.com']
    payload.bcc = ['bcc1@domain.com', 'bcc2@domain.com']

    const answer = await app.sendMail(payload)

    assert.ok(mock.isDone(), 'should send message to postal')
    assert.strictEqual(answer.__pmtransport, 'postal', 'should indicate correct transport')
    assert.ok(answer, 'should have an answer')
    assert.ok(answer.client, 'answer should have client')
    assert.ok(answer.result, 'answer should have result')
    assert.ok(answer.result.messages, 'answer should have messages')
    assert.ok(answer.result.messages.KEY, 'messages should have keyed value')
    assert.ok(answer.result.messages.KEY['message-id'], 'should have a message id')
    assert.ok(
      answer.result.messages.KEY['x-postal-msgid'],
      'should have a postal message id'
    )
  })

  test('should send from different sender', async () => {
    const mock = postalMock(app, 200, { from: 'test@somewhere.com' })

    const payload = defaultPayload()
    payload.from = 'test@somewhere.com'

    await app.sendMail(payload)
    assert.ok(mock.isDone(), 'should send message to postal')
  })

  test('should send with fallback locale', async () => {
    const mock = postalMock(app, 200, (body) => {
      if (body.plain_body !== 'EN: bar' || !body.html_body.match(/EN: bar/)) { return false }

      return true
    })
    const payload = defaultPayload()
    delete payload.locale
    await app.sendMail(payload)
    assert.ok(mock.isDone(), 'should send message to postal')
  })

  test('should send with different locale', async () => {
    const mock = postalMock(app, 200, (body) => {
      if (body.plain_body !== 'DE: bar' || !body.html_body.match(/DE: bar/)) { return false }

      return true
    })
    const payload = defaultPayload()
    payload.locale = 'de'
    await app.sendMail(payload)
    assert.ok(mock.isDone(), 'should send message to postal')
  })

  test('should fail without required properties', async () => {
    const props = ['template', 'data', 'to', 'subject']
    for (const prop of props) {
      const payload = defaultPayload()
      delete payload[prop]
      await assert.rejects(
        () => app.sendMail(payload),
        (error) => error && error.code === 'ERR_ASSERTION' && error.operator === '==',
        `should fail on missing property ${prop}`
      )
    }
  })

  test('should send email with attachment', async () => {
    const mock = postalMock(app)
    const payload = defaultPayload()
    payload.attachments = [
      { filename: 'test.jpg', contentType: 'image/jpg', data: '' }
    ]
    await app.sendMail(payload)
    assert.ok(mock.isDone(), 'should send message to postal')
  })

  test('should fail on invalid attachment data', async () => {
    const payload = defaultPayload()
    payload.attachments = [
      { filename: 'test.jpg', contentType: 'image/jpg', data: {} }
    ]
    await assert.rejects(
      () => app.sendMail(payload),
      (error) => error && error.code === 'ERR_ASSERTION' && error.operator === '==',
      'should fail on invalid attachment data'
    )
  })

  test('should fail on invalid attachment filename', async () => {
    const payload = defaultPayload()
    payload.attachments = [
      { filename: null, contentType: 'image/jpg', data: '' }
    ]
    await assert.rejects(
      () => app.sendMail(payload),
      (error) => error && error.code === 'ERR_ASSERTION' && error.operator === '==',
      'should fail on invalid attachment data'
    )
  })
})
