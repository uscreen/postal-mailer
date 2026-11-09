/**
 * Minimal Postal API client, drop-in for `@atech/postal`'s Client.
 *
 * The upstream client parses the response inside a stream callback, so a
 * non-JSON answer (e.g. an HTML 502 page from a proxy) throws outside the
 * promise and crashes the process. Here every failure — network error,
 * non-JSON body, Postal error status — rejects the returned promise.
 */

const SNIPPET_LENGTH = 200
const DEFAULT_TIMEOUT = 30000

export class PostalError extends Error {
  constructor(message, { status = null, code = null, data = null, body = null } = {}) {
    super(message)
    this.name = 'PostalError'
    this.status = status
    this.code = code
    this.data = data
    this.body = body
  }
}

const isTimeout = error =>
  error?.name === 'TimeoutError' || error?.cause?.name === 'TimeoutError'

/**
 * @param {string} host postal server host
 * @param {string} serverKey postal server API key
 * @param {object} options
 * @param {number} options.timeout ms until the whole request (incl. body) is aborted
 */
export const createClient = (host, serverKey, { timeout = DEFAULT_TIMEOUT } = {}) => {
  const makeRequest = async (controller, action, parameters) => {
    let response
    let body
    try {
      response = await fetch(`https://${host}/api/v1/${controller}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Server-API-Key': serverKey
        },
        body: JSON.stringify(parameters),
        signal: AbortSignal.timeout(timeout)
      })
      body = await response.text()
    }
    catch (error) {
      if (isTimeout(error)) {
        throw new PostalError(`Postal request timed out after ${timeout}ms`, {
          code: 'Timeout'
        })
      }
      throw error
    }

    let json
    try {
      json = JSON.parse(body)
    }
    catch {
      throw new PostalError(
        `Postal responded with a non-JSON body (HTTP ${response.status})`,
        {
          status: response.status,
          body: body.slice(0, SNIPPET_LENGTH)
        }
      )
    }

    if (json?.status !== 'success') {
      throw new PostalError(
        json?.data?.message || `Postal request failed (HTTP ${response.status})`,
        { status: response.status, code: json?.data?.code ?? null, data: json?.data ?? null }
      )
    }

    return json.data
  }

  return { host, serverKey, makeRequest }
}
