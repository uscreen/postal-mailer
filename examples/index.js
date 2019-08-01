'use strict'

/**
 * configure
 */
const mailer = require('../index')({
  // load config defaults from .env file
  useDotenv: true,

  // override with inline options if needed
  postalSender: 'domains+noreply@postal-stage.uscreen.net'

  // when set, locales will default to 'en'
  // and templates will default `./templates/en` instead of `./templates`
  // postalDefaultLocale: 'en'
})

/**
 * view data to be passed to template
 */
const data = {
  user: {
    firstName: 'Marcus',
    lastName: 'Spiegel'
  }
}

/**
 * send mail
 */
const send = async () => {
  const result = await mailer
    .sendMail({
      data,
      template: 'test',
      to: 'spiegel@uscreen.de',
      subject: 'Example Test Mail'
      // locale: 'ru' // --> will use `./templates/en/test.mjml` as `ru` is not existing
    })
    .catch(e => {
      console.error('ERROR sending mail:', e)
    })

  console.log(result)
}

send()
