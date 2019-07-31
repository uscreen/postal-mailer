'use strict'

const mailer = require('../index')({
  // load config defaults from .env file
  useDotenv: true,

  // override with inline options if needed
  postalSender: 'domains+noreply@uscreen.net'
})

console.log(mailer)

console.log(mailer.readTemplate('test'))
