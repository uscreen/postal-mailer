'use strict'

const path = require('path')
const fs = require('fs')
// const handlebars = require('handlebars')
const Postal = require('@atech/postal')
// const mjml2html = require('mjml').default
// const htmlToText = require('html-to-text')

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
   */
  const getTemplatePath = (template, locale) => {
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
   */
  const readTemplate = (template, locale) =>
    fs.readFileSync(getTemplatePath(template, locale), {
      encoding: 'utf8'
    })

  // const compileBody = (data, locale, template) => {
  //   const localData = Object.assign(data, {
  //     assets: app.config.postal.assets
  //   })

  //   // handlebars to fill in data
  //   const htmlBody = handlebars.compile(readTemplate(locale, template))(
  //     localData
  //   )

  //   // mjml to process to html markup
  //   return mjml2html(htmlBody, {
  //     filePath: getTemplatePath(locale, template)
  //   }).html
  // }

  // const sendMail = (data, htmlBody) => {
  //   const plainBody = htmlToText.fromString(htmlBody, {
  //     ignoreImage: true
  //   })

  //   const message = new Postal.SendMessage(client)
  //   message.from(app.config.postal.from)
  //   message.to(data.email)
  //   message.subject(data.subject)
  //   message.htmlBody(htmlBody)
  //   message.plainBody(plainBody)
  //   return message.send().catch(err => {
  //     app.log.error({
  //       service: 'postal',
  //       details: err
  //     })
  //   })
  // }

  return {
    name,
    version,
    client,
    // dev only
    getTemplatePath,
    readTemplate
    // sendRecovery(data, locale) {
    //   console.log(data)
    //   const htmlBody = compileBody(data, locale, 'pw_reset.mjml')
    //   // console.log(htmlBody)
    //   return sendMail(data, htmlBody)
    // }
  }
}
