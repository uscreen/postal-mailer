'use strict'

const assert = require('assert')
const nodemailer = require('nodemailer')
const utils = require('./utils')

module.exports = (config) => {
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
   * @param {string} template basename of template (ie. 'test' => `test.mjml`)
   * @param {object} data data to be rendered by handelbars
   * @param {string} to the recepients email address
   * @param {string} subject the emails subject
   * @param {string} locale optional: the users locale (ie. 'en')
   * @param {string} from optional: the senders  email address
   * @param {object[]} attachments optional: files to be attached
   * @param {string} attachments[].filename filename of attachment
   * @param {string} attachments[].contentType content type of attachment
   * @param {(string|Buffer)} attachments[].data attachment data
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

    assert(subject, 'providing a value for subject is required')
    assert(typeof subject === 'string', 'subject should be a string')

    assert(typeof locale === 'string', 'locale should be a string')

    assert(Array.isArray(attachments), 'attachments should be array')
    assert(
      attachments.every((a) => typeof a.filename === 'string'),
      "all attachments' filenames should be string"
    )
    assert(
      attachments.every((a) => typeof a.contentType === 'string'),
      "all attachments' content types should be string"
    )
    assert(
      attachments.every(
        (a) => typeof a.data === 'string' || a.data instanceof Buffer
      ),
      "all attachments' data should be string or buffer"
    )

    const htmlBody = compileHtmlBody(template, data, locale)
    const plainBody = compilePlainBody(htmlBody)

    const message = {}
    if (from) message.sender = from

    message.from = from || config.postalSender
    message.to = to
    message.subject = subject
    message.text = plainBody
    message.html = htmlBody

    if (cc) message.cc = cc
    if (bcc) message.bcc = bcc

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
