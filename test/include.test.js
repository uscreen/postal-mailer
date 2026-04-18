import assert from 'node:assert'
import { describe, test } from 'node:test'
import { build } from './helper.js'

describe('mj-include', () => {
  test('should render content from included partial', async () => {
    const { compileHtmlBody } = await build()
    const html = await compileHtmlBody('test-include', {}, 'en')

    assert.match(html, /Main content/, 'should have main template content')
    assert.match(html, /Included CTA content/, 'should have content from mj-include partial')
  })
})
