'use strict'

const path = require('path')
const fs = require('fs')
const assert = require('assert')
const handlebars = require('handlebars')
const nodemailer = require('nodeMailer')
const mjml2html = require('mjml')
const htmlToText = require('html-to-text')
const globby = require('globby')

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

  /**
   * scan template directory for locale directories
   *
   * @return {array}
   */
  const scanLocales = () => {
    const dirs = path.join(config.postalTemplates, './*')
    const files = path.join(config.postalTemplates, './*.mjml')

    const paths = globby.sync([dirs, `!${files}`], {
      onlyFiles: false
    })

    return paths.map((p) => path.basename(p))
  }

  /**
   * generate path to template file
   * @param {string} template basename of template (ie. 'test' => `test.mjml`)
   * @param {string} locale the users locale (ie. 'en')
   *
   * @return {string}
   */
  const getTemplatePath = (template, locale) => {
    const localePath =
      locale && config.locales.includes(locale)
        ? locale
        : config.postalDefaultLocale
    return path.join(config.postalTemplates, localePath, template) + '.mjml'
  }

  /**
   * read template from filesystem
   * @param {string} template basename of template (ie. 'test' => `test.mjml`)
   * @param {string} locale the users locale (ie. 'en')
   *
   * @return {string}
   */
  const readTemplate = (template, locale) =>
    fs.readFileSync(getTemplatePath(template, locale), {
      encoding: 'utf8'
    })

  /**
   * compile data -> handlebars -> mjml -> html
   * @param {string} template basename of template (ie. 'test' => `test.mjml`)
   * @param {object} data data to be rendered by handelbars
   * @param {string} locale the users locale (ie. 'en')
   *
   * @return {string}
   */
  const compileHtmlBody = (template, data, locale) => {
    const localData = Object.assign(data, {
      postalAssetsUrl: config.postalAssetsUrl
    })

    // handlebars to fill in data
    const htmlBody = handlebars.compile(readTemplate(template, locale))(
      localData
    )

    // mjml to process to html markup
    return mjml2html(htmlBody, {
      filePath: getTemplatePath(template, locale),
      beautify: true
    }).html
  }

  /**
   * parse html email body to plain text
   * @param {string} htmlBody compiled HTML Body as returned by compileHtmlBody()
   *
   * @return {string}
   */
  const compilePlainBody = (htmlBody) =>
    htmlToText.fromString(htmlBody, {
      ignoreImage: true
    })

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
  const sendMail = ({
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

    if (cc) message.cc(cc)
    if (bcc) message.bcc(bcc)

    message.attachments = []
    for (const { filename, contentType, data: content } of attachments) {
      message.attachments.push({ filename, contentType, content })
    }

    return client.sendMail(message)
  }

  config.locales = scanLocales()

  return {
    client,
    sendMail
  }
}
