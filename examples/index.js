'use strict'

const mailer = require('../index')({
  // load defaults from .env file
  useDotenv: true,

  // override with inline options
  postalSender: 'domains+noreply@uscreen.net'
})

console.log(mailer)
