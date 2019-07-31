'use strict'

const path = require('path')
const fs = require('fs')
const handlebars = require('handlebars')
const Postal = require('@atech/postal')
const mjml2html = require('mjml')
const htmlToText = require('html-to-text')

const configure = require('./config')
const { name, version } = require('../package.json')

module.exports = ({ opts }) => {
  /**
   * verify config options
   */
  const config = configure(opts)

  /**
   * initiate a Postal Client
   */
  const client = new Postal.Client(config.postalServer, config.postalKey)

  /**
   * generate path to template file
   * @param {string} template basename of template (ie. 'test' => `test.mjml`)
   * @param {string} locale the users locale (ie. 'en')
   *
   * @return {string}
   */
  const getTemplatePath = (template, locale) => {
    // TODO: implement multilanguage features
    // const localePath = locale && ['de', 'en'].includes(locale) ? locale : 'en'
    return path.join(config.postalTemplates, template) + '.mjml'
    // return path.join(
    //   app.root,
    //   app.config.postal.templates,
    //   localePath,
    //   template
    // )
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
  const compilePlainBody = htmlBody =>
    htmlToText.fromString(htmlBody, {
      ignoreImage: true
    })

  /**
   * send mail from template, compiled with data
   * @param {string} template basename of template (ie. 'test' => `test.mjml`)
   * @param {object} data data to be rendered by handelbars
   * @param {string} to the recepients email address
   * @param {string} subject the emails subject
   * @param {string} locale the users locale (ie. 'en')
   *
   * @return {Promise}
   */
  const sendMail = ({ template, data, to, subject, locale }) => {
    const htmlBody = compileHtmlBody(template, data, locale)
    const plainBody = compilePlainBody(htmlBody)

    const message = new Postal.SendMessage(client)
    message.from(config.postalSender)
    message.to(to)
    message.subject(subject)
    message.htmlBody(htmlBody)
    message.plainBody(plainBody)
    return message.send()
  }

  return {
    name,
    version,
    client,
    sendMail
  }
}
