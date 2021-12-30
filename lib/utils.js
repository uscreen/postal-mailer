'use strict'

const path = require('path')
const fs = require('fs')
const handlebars = require('handlebars')
const mjml2html = require('mjml')
const htmlToText = require('html-to-text')
const globby = require('globby')

module.exports = (config) => {
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
      filePath: getTemplatePath(template, locale)
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

  config.locales = scanLocales()

  return {
    compileHtmlBody,
    compilePlainBody
  }
}
