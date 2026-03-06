# Agent Guidelines for postal-mailer

## Overview

`@uscreen.de/postal-mailer` is an ESM-only Node.js library for sending transactional
emails via Postal API or SMTP. It compiles MJML templates with Handlebars, supports
layout inheritance, i18n via locale-based template directories, and frontmatter metadata.

## Build/Test Commands

- **Install**: `pnpm install` (use pnpm, not npm -- enforced via `packageManager` field)
- **Lint**: `pnpm run lint` (ESLint, no auto-fix)
- **Lint + fix**: `pnpm run lint:fix` (ESLint with `--fix`)
- **Test all**: `pnpm test` or `node --test test/*.test.js`
- **Test single file**: `node --test test/api.test.js`
- **Test single case**: `node --test --test-name-pattern="pattern" test/api.test.js`
- **Test with coverage**: `pnpm run test:cov` (HTML + text report via c8)

Node.js 20+ required. `.nvmrc` specifies Node 24. CI tests against 20, 22, 24.
SMTP tests (`test/smtp.test.js`) require a running Mailpit instance on ports 1025/8025.
Start it via: `docker run -d -p 1025:1025 -p 8025:8025 axllent/mailpit:latest`
API tests (`test/api.test.js`) use nock to mock HTTP -- no external services needed.
Layout tests (`test/layout.test.js`) use temp directories -- no external services needed.

## Project Structure

```
index.js           # Package entry point, re-exports lib/index.js
lib/
  index.js         # Core factory: validates config, selects transport
  config.js        # env-schema based configuration validation
  utils.js         # Template compilation (MJML, Handlebars, layouts)
  postal.js        # Postal API transport (@atech/postal)
  smtp.js          # SMTP transport (nodemailer)
test/
  helper.js        # Test builder factory (build function)
  interceptor.js   # Nock HTTP body-matching helper
  api.test.js      # Postal API transport tests (uses nock)
  smtp.test.js     # SMTP transport tests (requires Mailpit)
  layout.test.js   # Layout inheritance tests (uses temp dirs)
  templates/       # Test MJML templates organized by locale (en/, de/)
```

## Module System & Imports

This is an **ESM-only** project (`"type": "module"` in package.json).

### Import ordering convention

1. Node.js built-ins with `node:` protocol prefix
2. Third-party packages (bare specifiers)
3. Relative imports (always with `.js` extension)

```js
import assert from 'node:assert'           // 1. Node built-ins
import { test, describe } from 'node:test'
import nock from 'nock'                     // 2. Third-party
import app from '../index.js'              // 3. Relative (always .js ext)
```

### Export patterns

- **`export default`** for main module exports (all lib/ files, entry point)
- **Named `export { name }`** for utility/helper exports (test helpers)

## Code Style & Formatting

Uses `@antfu/eslint-config` (flat config in `eslint.config.js`) with formatters enabled.
Key rules: `comma-dangle: never`, `curly: multi-line, consistent`, `no-console: off`.
Prettier: no semicolons, single quotes, no trailing commas, bracket spacing enabled.

### Naming Conventions

- **Files**: kebab-case (`test-with-subject.mjml`)
- **Variables/functions/config**: camelCase (`compileHtmlBody`, `postalServer`)
- **Internal markers**: double-underscore prefix (`__pmtransport`)
- **No UPPER_SNAKE_CASE** constants -- everything is camelCase

### Brace Style

Stroustrup style -- `else` on a new line after the closing brace:

```js
if (contentMatch) {
  content = contentMatch[1].trim()
}
else {
  content = content.trim()
}
```

## Architecture Pattern

Every module follows a **factory function / closure pattern**. Modules export a function
that receives config and returns an object of methods. No classes are used.

The initialization chain: `index.js` -> `lib/index.js` -> `config.js` (validate) ->
select transport (`postal.js` or `smtp.js`) -> return `{ client, sendMail, compileHtmlBody, compilePlainBody }`.

## Error Handling

**Input validation** -- use `assert` in library code:

```js
assert(template, 'providing a value for template is required')
assert(typeof template === 'string', 'template should be a string')
```

**I/O operations** -- try/catch with graceful fallback (note: bare `catch {`, no param):

```js
try {
  layoutContent = fs.readFileSync(layoutPath, { encoding: 'utf8' })
} catch {
  console.error(`Layout not found: ${layoutName}`)
  return `<mjml><mj-body>${content}</mj-body></mjml>`
}
```

**Tests** -- use `assert.rejects()` with predicate functions:

```js
await assert.rejects(
  () => app.sendMail(payload),
  (error) => error && error.code === 'ERR_ASSERTION' && error.operator === '==',
  `should fail on missing property ${prop}`
)
```

## Test Patterns

### Framework: Node.js built-in test runner (`node:test`)

- Use `describe()` for grouping, `test()` for individual cases
- Use `beforeEach()` / `afterEach()` for setup/teardown
- Assertions: `assert.ok()`, `assert.strictEqual()`, `assert.match()`,
  `assert.doesNotMatch()`, `assert.rejects()`, `assert.deepStrictEqual()`
- HTTP mocking: `nock` with custom interceptor (`test/interceptor.js`)
- Test builder: `build()` factory from `test/helper.js` creates configured app instances
- SMTP tests need Mailpit (`axllent/mailpit:latest`) on ports 1025/8025
- Mailpit cleanup: `DELETE /api/v1/messages` between tests via custom `mailpitClient()`

## Template System

- Templates live in locale directories: `templates/en/`, `templates/de/`
- Frontmatter uses HTML comment delimiters: `<!-- @meta ... -->`
- Layout inheritance: `layout: base` in frontmatter references `layouts/base.mjml`
- Content blocks: `<!-- @content -->...<!-- @endcontent -->`
- Style blocks: `<!-- @styles -->...<!-- @endstyles -->`
- Layouts use triple-stache `{{{content}}}` for unescaped HTML insertion

## Configuration

Uses `env-schema` (Fastify ecosystem) with JSON Schema validation. Required:
`postalTemplates`, `postalServer`, `postalKey`. Optional: `postalTransport`
(postal/smtp, default `postal`), `postalPort` (default 25), `postalUser`,
`postalSender`, `postalAssetsUrl`, `postalDefaultLocale`. All camelCase.

## CI/CD

- GitHub Actions (`.github/workflows/main.yml`), triggers on push/PR to `master`/`main`
- Matrix: Node.js 20, 22, 24 with pnpm (`pnpm/action-setup@v4`)
- Starts Mailpit via `docker run` for SMTP tests, coverage uploaded to Coveralls
- Dependabot auto-merge for dependency updates
