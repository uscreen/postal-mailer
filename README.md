# postal-mailer

> Mailer engine using mjml templates to send mail via postal api

## Features

* configure inline (json object) or by dotenv
* uses handlebars + mjml for compilation and render
* sends mails via postal api

## Install

```sh
$ yarn add @uscreen.de/postal-mailer # or use npm -i
```

## Configure 

```js
const mailer = require('@uscreen.de/postal-mailer')({
  // load config defaults from .env file (defaults to false)
  useDotenv: true,

  // override with inline options if needed
  postalSender: 'domains+noreply@postal-stage.uscreen.net'
})
```

more details see `./examples`

## Use

```js
const result = await mailer
  .sendMail({
    data,
    template: 'test',
    to: 'recpt@example.com',
    subject: 'Example Test Mail'
  })
  .then(r => {
    console.log('RESULT:', r)
  })
  .catch(e => {
    console.error('ERROR sending mail:', e)
  })
```

## Roadmap

- add multilang support (stubbed)
- add tests (shame)
- add api/config docs