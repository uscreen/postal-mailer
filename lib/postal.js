import assert from 'node:assert'
import { Buffer } from 'node:buffer'
import Postal from '@atech/postal'
import handlebars from 'handlebars'
import { normalizeRecipients } from './recipients.js'
import utils from './utils.js'

export default (config) => {
  /**
   * initiate a Postal Client
   */
  const client = new Postal.Client(config.postalServer, config.postalKey)

  const { compileHtmlBody, compilePlainBody } = utils(config)

  /**
   * send mail from template, compiled with data
   * @param {object} options mail options
   * @param {string} options.template basename of template (ie. 'test' => `test.mjml`)
   * @param {object} options.data data to be rendered by handlebars
   * @param {string|string[]} options.to the recipient email address(es)
   * @param {string} options.subject the emails subject
   * @param {string} options.locale optional: the users locale (ie. 'en')
   * @param {string} options.from optional: the senders email address
   * @param {string|string[]} options.cc optional: CC email address(es)
   * @param {string|string[]} options.bcc optional: BCC email address(es)
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

    const toList = normalizeRecipients(to, 'to', true)
    const ccList = normalizeRecipients(cc, 'cc')
    const bccList = normalizeRecipients(bcc, 'bcc')

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
    let finalSubject = templateMeta.subject || subject

    // Compile subject with Handlebars if it contains template variables
    if (finalSubject && finalSubject.includes('{{')) {
      finalSubject = handlebars.compile(finalSubject)(data)
    }

    // Assert subject exists (either from template or parameter)
    assert(finalSubject, 'providing a value for subject is required (either as parameter or in template frontmatter)')
    assert(typeof finalSubject === 'string', 'subject should be a string')

    const plainBody = compilePlainBody(htmlBody)

    const message = new Postal.SendMessage(client)

    // if from is set authenticate via sender header
    if (from) {
      message.sender(config.postalSender)
    }

    message.from(from || config.postalSender)
    for (const address of toList) {
      message.to(address)
    }
    message.subject(finalSubject)
    message.htmlBody(htmlBody)
    message.plainBody(plainBody)

    for (const address of ccList) {
      message.cc(address)
    }
    for (const address of bccList) {
      message.bcc(address)
    }

    // @todo add full support
    // Add any custom headers
    // message.header('X-PHP-Test', 'value')

    // Attach any files
    for (const { filename, contentType, data } of attachments) {
      message.attach(filename, contentType, data)
    }

    const result = await message.send()

    return { ...result, __pmtransport: 'postal' }
  }

  return {
    client,
    sendMail,
    compileHtmlBody,
    compilePlainBody
  }
}
