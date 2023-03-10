const equal = require('deep-equal')

const defaults = () => ({
  to: ['foo@domain.com'],
  subject: 'test',
  headers: {},
  from: 'mail@domain.com'
})

const intercept =
  (additional = {}) =>
  (body) => {
    const customInterceptor =
      typeof additional === 'function' ? additional : () => true

    const data =
      typeof additional === 'function'
        ? defaults()
        : { ...defaults(), ...additional }

    const retained = {}
    Object.keys(body).forEach((k) => {
      if (!data[k]) {
        retained[k] = body[k]
        delete body[k]
      }
    })

    return equal(body, data) && customInterceptor({ ...body, ...retained })
  }

module.exports = {
  intercept
}
