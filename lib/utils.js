'use strict'

const fs = require('node:fs')
const path = require('node:path')
const globby = require('globby')
const matter = require('gray-matter')
const handlebars = require('handlebars')
const htmlToText = require('html-to-text')
const mjml2html = require('mjml')

module.exports = (config) => {
  /**
   * scan template directory for locale directories
   *
   * @return {Array}
   */
  const scanLocales = () => {
    const dirs = path.join(config.postalTemplates, './*')
    const files = path.join(config.postalTemplates, './*.mjml')

    const paths = globby.sync([dirs, `!${files}`], {
      onlyFiles: false
    })

    return paths.map(p => path.basename(p))
  }

  /**
   * generate path to template file
   * @param {string} template basename of template (ie. 'test' => `test.mjml`)
   * @param {string} locale the users locale (ie. 'en')
   *
   * @return {string}
   */
  const getTemplatePath = (template, locale) => {
    const localePath
      = locale && config.locales.includes(locale)
        ? locale
        : config.postalDefaultLocale
    return `${path.join(config.postalTemplates, localePath, template)}.mjml`
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
   * Process template with layout inheritance using gray-matter
   * @param {string} templateContent - Raw template content
   * @param {string} templatePath - Path to the template file
   * @param {object} data - Template data
   * @return {string} - Processed template content
   */
  const processLayoutInheritance = (templateContent, templatePath, data) => {
    // Parse front matter with custom delimiters for HTML comments
    const parsed = matter(templateContent, {
      delimiters: ['<!-- @meta', '-->'],
      engines: {
        yaml: {
          parse: (str) => {
            // Simple key-value parser for our use case
            const result = {}
            const lines = str.trim().split('\n')

            for (const line of lines) {
              const trimmed = line.trim()
              if (trimmed.startsWith('layout:')) {
                result.layout = trimmed.substring(7).trim()
              }
              else {
                // Parse key: value format (with or without quotes)
                const match = trimmed.match(/^(\w+):\s*(.+)$/)
                if (match) {
                  let value = match[2].trim()
                  // Remove quotes if present
                  if ((value.startsWith('"') && value.endsWith('"')) || 
                      (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1)
                  }
                  result[match[1]] = value
                }
              }
            }

            return result
          }
        }
      }
    })

    // If no layout specified, return original content
    if (!parsed.data.layout) {
      return templateContent
    }

    const layoutName = parsed.data.layout
    const templateDir = path.dirname(templatePath)
    
    // Support both relative paths and layouts directory
    let layoutPath
    if (layoutName.includes('/') || layoutName.startsWith('.')) {
      // It's a relative path, resolve it from the template directory
      layoutPath = path.resolve(templateDir, layoutName)
    } else {
      // It's just a filename, look in layouts directory
      layoutPath = path.join(templateDir, 'layouts', layoutName)
    }

    // Extract custom styles if present
    let customStyles = ''
    let content = parsed.content

    const stylesMatch = content.match(/<!--\s*@styles\s*-->([\s\S]*?)<!--\s*@endstyles\s*-->/)
    if (stylesMatch) {
      customStyles = stylesMatch[1].trim()
      content = content.replace(stylesMatch[0], '')
    }

    // Extract content section if present
    const contentMatch = content.match(/<!--\s*@content\s*-->([\s\S]*?)<!--\s*@endcontent\s*-->/)
    if (contentMatch) {
      content = contentMatch[1].trim()
    }
    else {
      // Clean up any remaining content
      content = content.trim()
    }

    // Load layout
    let layoutContent
    try {
      layoutContent = fs.readFileSync(layoutPath, { encoding: 'utf8' })
    }
    catch (error) {
      // If layout not found, provide helpful error message
      const possiblePaths = [
        path.join(templateDir, layoutName),
        path.join(templateDir, 'layouts', layoutName),
        layoutPath
      ]
      console.error(`Layout not found: ${layoutName}`)
      console.error(`Searched in:`)
      possiblePaths.forEach(p => console.error(`  - ${p}`))
      console.error(`Template path: ${templatePath}`)
      
      // Return original content wrapped in basic MJML
      return `<mjml><mj-body>${content}</mj-body></mjml>`
    }

    // Prepare data for layout
    const layoutData = {
      ...data,
      ...parsed.data,
      content,
      customStyles
    }

    // Remove layout from data to avoid confusion
    delete layoutData.layout

    // Compile layout with data
    return handlebars.compile(layoutContent)(layoutData)
  }

  /**
   * compile data -> handlebars -> mjml -> html
   * @param {string} template basename of template (ie. 'test' => `test.mjml`)
   * @param {object} data data to be rendered by handelbars
   * @param {string} locale the users locale (ie. 'en')
   *
   * @return {string|object} html string or object with html and metadata when returnMeta is true
   */
  const compileHtmlBody = (template, data, locale, returnMeta = false) => {
    const localData = Object.assign(data, {
      postalAssetsUrl: config.postalAssetsUrl
    })

    const templatePath = getTemplatePath(template, locale)
    const templateContent = readTemplate(template, locale)

    // Extract frontmatter for potential return
    const parsed = matter(templateContent, {
      delimiters: ['<!-- @meta', '-->'],
      engines: {
        yaml: {
          parse: (str) => {
            const result = {}
            const lines = str.trim().split('\n')

            for (const line of lines) {
              const trimmed = line.trim()
              if (trimmed.startsWith('layout:')) {
                result.layout = trimmed.substring(7).trim()
              }
              else {
                const match = trimmed.match(/^(\w+):\s*(.+)$/)
                if (match) {
                  let value = match[2].trim()
                  if ((value.startsWith('"') && value.endsWith('"')) || 
                      (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1)
                  }
                  result[match[1]] = value
                }
              }
            }

            return result
          }
        }
      }
    })

    // Process layout inheritance if applicable
    const processedTemplate = processLayoutInheritance(templateContent, templatePath, localData)

    // handlebars to fill in data
    const htmlBody = handlebars.compile(processedTemplate)(localData)

    // mjml to process to html markup
    const html = mjml2html(htmlBody, {
      filePath: templatePath
    }).html

    if (returnMeta) {
      return {
        html,
        meta: parsed.data
      }
    }

    return html
  }

  /**
   * parse html email body to plain text
   * @param {string} htmlBody compiled HTML Body as returned by compileHtmlBody()
   *
   * @return {string}
   */
  const compilePlainBody = htmlBody =>
    htmlToText.convert(htmlBody, {
      ignoreImage: true
    })

  config.locales = scanLocales()

  return {
    compileHtmlBody,
    compilePlainBody,
    processLayoutInheritance
  }
}
