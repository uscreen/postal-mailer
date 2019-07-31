'use strict'

/**
 * configure
 */
const mailer = require('../index')({
  // load config defaults from .env file
  useDotenv: true,

  // override with inline options if needed
  postalSender: 'domains+noreply@postal-stage.uscreen.net'
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
      // locale
    })
    .catch(e => {
      console.error('ERROR sending mail:', e)
    })

  console.log(result)
}

send()
