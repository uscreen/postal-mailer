import assert from 'node:assert'

/**
 * validate a recipient field and normalize it to an array of addresses
 * accepts a single address string or an array of address strings; nullish
 * values and falsy entries are dropped, so the result is always a clean list
 * @param {string|string[]} value a single address or an array of addresses
 * @param {string} field field name used in assertion messages (ie. 'to')
 * @param {boolean} required whether at least one address must be present
 *
 * @return {string[]} normalized list of addresses (empty when none are given)
 */
const normalizeRecipients = (value, field, required = false) => {
  // wrap, flatten and drop falsy entries -> always a list of 0+ truthy values
  const list = [value].flat().filter(Boolean)

  assert(
    list.every(address => typeof address === 'string'),
    `${field} should be a string or an array of strings`
  )
  assert(!required || list.length > 0, `providing a value for ${field} is required`)

  return list
}

export { normalizeRecipients }
