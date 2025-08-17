import { test, beforeEach, describe } from 'node:test'
import assert from 'node:assert'
import { build } from './helper.js'

const defaultPayload = () => ({
  template: 'test',
  data: {
    foo: 'bar'
  },
  to: 'foo@domain.com',
  subject: 'test',
  locale: 'de'
})

const mailpitClient = (host) => ({
  async messages() {
    try {
      const response = await fetch(`http://${host}:8025/api/v1/messages`)
      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.statusText}`)
      }
      const data = await response.json()
      
      if (!data.messages || !Array.isArray(data.messages)) {
        console.error('Unexpected response structure:', data)
        throw new Error('Invalid response structure from Mailpit API')
      }
      
      const items = await Promise.all(
        data.messages.map(async (msg) => {
          const msgResponse = await fetch(`http://${host}:8025/api/v1/message/${msg.ID}`)
          if (!msgResponse.ok) {
            throw new Error(`Failed to fetch message ${msg.ID}: ${msgResponse.statusText}`)
          }
          const fullMsg = await msgResponse.json()
          
          // Get raw message content for attachment verification
          const rawResponse = await fetch(`http://${host}:8025/api/v1/message/${msg.ID}/raw`)
          const rawContent = rawResponse.ok ? await rawResponse.text() : ''
          
          // Combine To and Bcc addresses for Raw.To (MailHog compatibility)
          const allRecipients = [
            ...(fullMsg.To?.map(t => t.Address) || []),
            ...(fullMsg.Bcc?.map(b => b.Address) || [])
          ]
          
          return {
            from: fullMsg.From?.Address || '',
            to: fullMsg.To?.[0]?.Address || '',
            cc: fullMsg.Cc?.[0]?.Address || '',
            subject: fullMsg.Subject || '',
            html: fullMsg.HTML || '',
            text: fullMsg.Text || '',
            Raw: {
              To: allRecipients
            },
            Content: {
              Body: rawContent
            }
          }
        })
      )
      
      return {
        total: data.messages_count || 0,
        items
      }
    } catch (error) {
      console.error('Error in mailpitClient.messages():', error)
      throw error
    }
  },

  async deleteAll() {
    try {
      const response = await fetch(`http://${host}:8025/api/v1/messages`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      if (!response.ok) {
        throw new Error(`Failed to delete messages: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Error in mailpitClient.deleteAll():', error)
      throw error
    }
  }
})

describe('sendmail: smtp', () => {
  let app, mpClient

  beforeEach(async () => {
    app = await build({ postalTransport: 'smtp' })
    mpClient = mailpitClient(app.postalOptions.postalServer)
    await mpClient.deleteAll()
  })

  test('should send email', async () => {
    const payload = defaultPayload()
    const result = await app.sendMail(payload)
    assert.ok(result, 'should have result')
    assert.strictEqual(
      result.accepted.length,
      1,
      'should have accepted all mail addresses'
    )

    assert.ok(result.messageId, 'should have message id')
    assert.strictEqual(result.__pmtransport, 'smtp', 'should use smtp as transport')

    const messages = await mpClient.messages()

    assert.strictEqual(messages.total, 1, 'should have 1 mail sent')

    const sentMail = messages.items[0]

    assert.strictEqual(
      sentMail.from,
      'mail@domain.com',
      'should send from mail@domain.com'
    )
    assert.strictEqual(sentMail.to, 'foo@domain.com', 'should send to foo@domain.com')
    assert.strictEqual(sentMail.subject, 'test', 'should send "test" as subject')
    assert.ok(
      sentMail.html && sentMail.html.match(/DE: bar/),
      'should have html body and templating enabled'
    )
    assert.ok(sentMail.text === 'DE: bar', 'should have plain text')
  })

  test('should send to cc', async () => {
    const payload = defaultPayload()
    payload.cc = ['cc@domain.com']
    const result = await app.sendMail(payload)
    assert.ok(result, 'should have result')
    assert.strictEqual(
      result.accepted.length,
      2,
      'should have accepted all mail addresses'
    )

    const messages = await mpClient.messages()
    assert.strictEqual(messages.total, 1, 'should have 1 mail sent')

    const message = messages.items[0]
    assert.strictEqual(
      message.from,
      'mail@domain.com',
      'should send from mail@domain.com'
    )
    assert.strictEqual(message.cc, 'cc@domain.com', 'should send CC to cc@domain.com')
  })

  test('should send to bcc', async () => {
    const payload = defaultPayload()
    payload.bcc = ['bcc1@domain.com', 'bcc2@domain.com']
    const result = await app.sendMail(payload)
    assert.ok(result, 'should have result')
    assert.strictEqual(
      result.accepted.length,
      3,
      'should have accepted all mail addresses'
    )

    const messages = await mpClient.messages()
    assert.strictEqual(messages.total, 1, 'should have 1 mail sent')

    const message = messages.items[0]
    payload.bcc.forEach((addr) => {
      assert.ok(message.Raw.To.includes(addr), `should send BCC to ${addr}`)
    })
  })

  test('should send from different sender', async () => {
    const payload = defaultPayload()
    payload.from = 'test@somewhere.com'
    const result = await app.sendMail(payload)

    assert.ok(result, 'should have result')

    const messages = await mpClient.messages()
    assert.strictEqual(messages.total, 1, 'should have 1 mail sent')
    const message = messages.items[0]
    assert.strictEqual(
      message.from,
      'test@somewhere.com',
      'should send from test@somewhere.com'
    )
  })

  test('should send with default locale', async () => {
    const payload = defaultPayload()
    delete payload.locale
    const result = await app.sendMail(payload)

    assert.ok(result, 'should have result')

    const messages = await mpClient.messages()
    assert.strictEqual(messages.total, 1, 'should have 1 mail sent')

    const message = messages.items[0]
    assert.ok(message.text === 'EN: bar', 'should return English text')
  })

  test('should send email with attachment', async () => {
    const payload = defaultPayload()
    payload.attachments = [
      { filename: 'test.jpg', contentType: 'image/jpg', data: '' }
    ]
    const result = await app.sendMail(payload)
    assert.ok(result, 'should have result')

    const messages = await mpClient.messages()
    assert.strictEqual(messages.total, 1, 'should have 1 mail sent')
    const message = messages.items[0]
    assert.ok(
      message.Content.Body.includes('Content-Type: image/jpg; name=test.jpg'),
      'should have attachment included'
    )
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
