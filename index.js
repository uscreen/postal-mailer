const lib = require('./lib')

module.exports = opts => {
  console.log('opts:', opts)
  opts.foo = 'bar'
  const mailer = lib({ opts })

  return {
    mailer
  }
}
