# postal-mailer

[![Test CI](https://github.com/uscreen/postal-mailer/actions/workflows/main.yml/badge.svg)](https://github.com/uscreen/postal-mailer/actions/workflows/node.js.yml)
[![Test Coverage](https://coveralls.io/repos/github/uscreen/postal-mailer/badge.svg?branch=master)](https://coveralls.io/github/uscreen/postal-mailer?branch=master)
[![Known Vulnerabilities](https://snyk.io/test/github/uscreen/postal-mailer/badge.svg?targetFile=package.json)](https://snyk.io/test/github/uscreen/postal-mailer?targetFile=package.json)
[![NPM Version](https://badge.fury.io/js/@uscreen.de%2Fpostal-mailer.svg)](https://badge.fury.io/js/@uscreen.de%2Fpostal-mailer)

> Mailer engine using mjml templates to send mail via postal api or smtp

## Features

- configure inline (json object) or by dotenv
- uses handlebars + mjml for compilation and render
- sends mails via postal api or smtp
- supports layout inheritance to reduce template duplication

## Install

```sh
$ yarn add @uscreen.de/postal-mailer # or use npm -i
```

## Example

```js
import postalMailer from '@uscreen.de/postal-mailer'

const mailer = postalMailer({
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
  .then((r) => {
    console.log('RESULT:', r)
  })
  .catch((e) => {
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
      <mj-all
        font-family="BlinkMacSystemFont, -apple-system, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif;"
      ></mj-all>
      <mj-text font-weight="300" font-size="16px" color="#000000" line-height="24px"></mj-text>
    </mj-attributes>
  </mj-head>

  <mj-body background-color="#F2F2F2">
    <mj-section background-color="#ff781e" padding="20px">
      <mj-column width="100%">
        <mj-text align="center" font-size="24px" color="#ffffff" font-weight="600"> A very simple Test E-Mail </mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#FFFFFF" padding="40px 20px">
      <mj-column width="100%">
        <mj-text>
          Greetings {{user.firstName}} {{user.lastName}},<br />
          <br />
          this is a simple example on how to setup a template and pass in some data.
        </mj-text>
        <mj-text> template will prefix all asset urls (ie. imgages) with<br />"{{postalAssetsUrl}}" </mj-text>
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

![Demo email rendered output](demomail.png)

### Layout System

To reduce repetition in your email templates, you can use the layout inheritance system. This allows you to define a base layout with common elements (header, footer, styles) and only write the unique content for each email.

#### Creating a Layout

Create a layout file in a `layouts` subdirectory within your template locale folder:

```html
<!-- templates/en/layouts/base.mjml -->
<mjml>
  <mj-head>
    <mj-title>{{title}}</mj-title>
    <mj-preview>{{preview}}</mj-preview>
    <mj-attributes>
      <mj-all font-family="Arial, sans-serif" />
    </mj-attributes>
    <mj-style> /* Common styles */ {{#if customStyles}}{{{customStyles}}}{{/if}} </mj-style>
  </mj-head>
  <mj-body>
    <!-- Common header -->
    <mj-section>
      <mj-column>
        <mj-text>{{companyName}}</mj-text>
      </mj-column>
    </mj-section>

    <!-- Main content -->
    {{{content}}}

    <!-- Common footer -->
    {{#unless hideFooter}}
    <mj-section>
      <mj-column>
        <mj-text>© 2024 {{companyName}}</mj-text>
      </mj-column>
    </mj-section>
    {{/unless}}
  </mj-body>
</mjml>
```

#### Using a Layout

To use a layout in your template, add a front matter section at the top:

```html
<!-- templates/en/welcome.mjml -->
<!-- @meta
layout: base.mjml
title: "Welcome to Our Service"
preview: "Get started with your new account"
-->

<!-- @styles -->
.highlight { color: #ff6600; }
<!-- @endstyles -->

<!-- @content -->
<mj-section>
  <mj-column>
    <mj-text> Welcome {{user.firstName}}! </mj-text>
    <mj-text css-class="highlight"> Your account is ready to use. </mj-text>
  </mj-column>
</mj-section>
<!-- @endcontent -->
```

#### Layout Directives

- `@meta` - Front matter section containing layout and variables
  - `layout:` - Specifies which layout file to use (relative to the layouts directory)
  - Other key-value pairs become variables passed to the layout
- `@styles` / `@endstyles` - Adds custom CSS styles to the layout
- `@content` / `@endcontent` - Wraps the main content of your email

All template data passed to `sendMail()` is also available in the layout.

## Options

All options can be managed via `.env` file and/or inline configuration as seen above. Overview of options:

| option                  | Description                                                                                                 | Default           | Example                             |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------- | ----------------------------------- |
| **useDotenv**           | whether to also read options from `.env` files                                                              | `false`           | `true`                              |
| **postalTransport**     | Send mail via Postal API or SMTP                                                                            | `postal`          | `smtp`                              |
| **postalServer**        | Postal Server Host                                                                                          |                   | postal.example.com                  |
| **postalPort**          | If sending via SMTP, the SMTP port                                                                          | 25                | 25                                  |
| **postalUser**          | If sending via SMTP, the SMTP username                                                                      |                   | acme/my-api                         |
| **postalKey**           | If sending via Postal API, the API Key to use. If sending via SMTP, the SMTP password                       |                   | ExAmPlE_key                         |
| **postalSender**        | From Address in emails                                                                                      |                   | noreply@example.com                 |
| **postalTemplates**     | path to directory containing email templates                                                                | `<cwd>/templates` | ./templates/mails                   |
| **postalAssetsUrl**     | url to prefix assets                                                                                        | `''`              | https://www.example.com/mail/assets |
| **postalDefaultLocale** | when set, locales will default to 'en' and templates will default `./templates/en` instead of `./templates` | `''`              | 'en'                                |

## API

### mailer.sendMail({ template, data, to, subject, locale = '' })

Send a `template` rendered with `data` `to` a recepient with a `subject`.
(In an optional language set by `locale`). Returns a Promise.

### mailer.compileHtmlBody(template, data, locale)

Compile a `template` with `data` and optional `locale` to an HTML string. Returns a Promise.

## Changelog

### 2.0.0

- **BREAKING:** `compileHtmlBody()` is now async and returns a Promise (due to mjml 5 upgrade)
- upgraded mjml from 4.x to 5.x
- updated example code to ESM

### 1.2.0

- added support for parsing template subject with Handlebars

### 1.1.0

- changed test runner from tab to node
- changed CommonJS to ESM
- upgraded all dependencies to latest versions
- removed deep-equal in favor of node:assert

### 1.0.0

- use pnpm as the package manager
- use htmlnano for minification to fix CVE-2022-37620
- added front matter support for parameters (ie. `subject`)

### 1.0.0-beta

- added layout inheritance system for templates
- templates can now extend from base layouts to reduce duplication
- added support for layout variables and custom styles
- uses gray-matter for safe and reliable front matter parsing

### 0.6.0

- added smtp example
- fixed pending upgrades

### 0.5.0

- added support of attachments
- added smtp transport

### 0.2.0

- added (optional) multilanguage support for templates
- added examples and docs

### 0.1.0

- rendering of templates (to html + text) & sending thru api works
