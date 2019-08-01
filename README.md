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

## Example 

```js
const mailer = require('@uscreen.de/postal-mailer')({
  // load config defaults from .env file (defaults to false)
  useDotenv: true,

  // override with inline options if needed
  postalSender: 'domains+noreply@postal-stage.uscreen.net'
})

const result = await mailer
  .sendMail({
    data,
    template: 'test',
    to: 'rcpt@example.com',
    subject: 'Example Test Mail'
  })
  .then(r => {
    console.log('RESULT:', r)
  })
  .catch(e => {
    console.error('ERROR sending mail:', e)
  })
```

## Template

Please refer to https://mjml.io and https://handlebarsjs.com. Start with example like so:

```html
<mjml>
  <mj-head>
    <mj-title>Test Mail</mj-title>
    <mj-attributes>
      <mj-all font-family="BlinkMacSystemFont, -apple-system, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif;"></mj-all>
      <mj-text font-weight="300" font-size="16px" color="#000000" line-height="24px"></mj-text>
    </mj-attributes>
  </mj-head>

  <mj-body background-color="#F2F2F2">

    <mj-section background-color="#ff781e" padding="20px">
      <mj-column width="100%">
        <mj-text align="center" font-size="24px" color="#ffffff" font-weight="600">
          A very simple Test E-Mail
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#FFFFFF" padding="40px 20px">
      <mj-column width="100%">
        <mj-text>
          Greetings {{user.firstName}} {{user.lastName}},<br>
          <br>
          this is a simple example on how to setup a template and pass in some data.
        </mj-text>
        <mj-text>
          template will prefix all asset urls (ie. imgages) with<br>"{{postalAssetsUrl}}"
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section padding="0px 0 20px 0">
      <mj-column>
        <mj-text align="center" color="#9B9B9B" font-size="11px">ACME Inc, Street. 1, 12345 City</mj-text>
      </mj-column>
    </mj-section>

  </mj-body>
</mjml>
```
which renders to something like this:

![](demomail.png)

## Options

All options can be managed via `.env` file and/or inline configuration as seen above. Overview of options:

| option              | Description                                    | Default           | Example                             |
|---------------------|------------------------------------------------|-------------------|-------------------------------------|
| __useDotenv__       | whether to also read options from `.env` files | `false`           | `true`                              |
| __postalServer__    | Postal Server Host                             |                   | postal.example.com                  |
| __postalKey__       | API Key to use                                 |                   | ExAmPlE_key                         |
| __postalSender__    | From Address in emails                         |                   | noreply@example.com                 |
| __postalTemplates__ | path to directory containing email templates   | `<cwd>/templates` | ./templates/mails                   |
| __postalAssetsUrl__ | url to prefix assets                           | `''`              | https://www.example.com/mail/assets |

## API

#### mailer.sendMail__({ template, data, to, subject, locale = '' })

Render a `template` with `data` and send it `to` a recepient with a `subject`.

## Roadmap

- add multilang support (stubbed)
- add tests (shame)
- add api/config docs