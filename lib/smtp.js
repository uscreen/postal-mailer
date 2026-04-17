import assert from 'node:assert'
import { Buffer } from 'node:buffer'
import nodemailer from 'nodemailer'
import utils from './utils.js'

export default (config) => {
  /**
   * initiate a Postal Client
   */
  const client = nodemailer.createTransport(
    {
      host: config.postalServer,
      port: config.postalPort,
      auth: {
        user: config.postalUser,
        pass: config.postalKey
      }
    },
    {
      Sender: config.postalSender
    }
  )

  const { compileHtmlBody, compilePlainBody } = utils(config)

  /**
   * send mail from template, compiled with data
   * @param {object} options mail options
   * @param {string} options.template basename of template (ie. 'test' => `test.mjml`)
   * @param {object} options.data data to be rendered by handlebars
   * @param {string} options.to the recipients email address
   * @param {string} options.subject the emails subject
   * @param {string} options.locale optional: the users locale (ie. 'en')
   * @param {string} options.from optional: the senders email address
   * @param {string} options.cc optional: CC email address
   * @param {string} options.bcc optional: BCC email address
   * @param {object[]} options.attachments optional: files to be attached
   *
   * @return {Promise}
   */
  const sendMail = async ({
    template,
    data,
    to,
    subject,
    locale = '',
    from = null,
    cc = null,
    bcc = null,
    attachments = []
  }) => {
    assert(template, 'providing a value for template is required')
    assert(typeof template === 'string', 'template should be a string')

    assert(data, 'providing a value for data is required')
    assert(typeof data === 'object', 'data should be an object')

    assert(to, 'providing a value for to is required')
    assert(typeof to === 'string', 'to should be a string')

    assert(typeof locale === 'string', 'locale should be a string')

    assert(Array.isArray(attachments), 'attachments should be array')
    assert(
      attachments.every(a => typeof a.filename === 'string'),
      'all attachments\' filenames should be string'
    )
    assert(
      attachments.every(a => typeof a.contentType === 'string'),
      'all attachments\' content types should be string'
    )
    assert(
      attachments.every(
        a => typeof a.data === 'string' || a.data instanceof Buffer
      ),
      'all attachments\' data should be string or buffer'
    )

    // Compile with metadata to get frontmatter subject if available
    const compiled = await compileHtmlBody(template, data, locale, true)
    const htmlBody = compiled.html
    const templateMeta = compiled.meta

    // Use template subject if available, fallback to provided subject
    const finalSubject = templateMeta.subject || subject

    // Assert subject exists (either from template or parameter)
    assert(finalSubject, 'providing a value for subject is required (either as parameter or in template frontmatter)')
    assert(typeof finalSubject === 'string', 'subject should be a string')

    const plainBody = compilePlainBody(htmlBody)

    const message = {}
    if (from) {
      message.sender = from
    }

    message.from = from || config.postalSender
    message.to = to
    message.subject = finalSubject
    message.text = plainBody
    message.html = htmlBody

    if (cc) {
      message.cc = cc
    }
    if (bcc) {
      message.bcc = bcc
    }

    message.attachments = []
    for (const { filename, contentType, data: content } of attachments) {
      message.attachments.push({ filename, contentType, content })
    }

    const result = await client.sendMail(message)

    return { ...result, __pmtransport: 'smtp' }
  }

  return {
    client,
    sendMail,
    compileHtmlBody,
    compilePlainBody
  }
}
