import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { test, beforeEach, afterEach, describe } from 'node:test'
import assert from 'node:assert'
import { build } from './helper.js'

// Create test templates with layout
const createTestTemplates = () => {
  const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'layout-test-'))
  
  // Create directory structure
  const deDir = path.join(testDir, 'de')
  const layoutsDir = path.join(deDir, 'layouts')
  fs.mkdirSync(deDir, { recursive: true })
  fs.mkdirSync(layoutsDir, { recursive: true })
  
  // Create layout file
  fs.writeFileSync(path.join(layoutsDir, 'base.mjml'), `<mjml>
  <mj-head>
    <mj-title>{{title}}</mj-title>
    <mj-preview>{{preview}}</mj-preview>
    <mj-attributes>
      <mj-all font-family="Arial, sans-serif" />
    </mj-attributes>
    <mj-style>
      {{#if customStyles}}{{{customStyles}}}{{/if}}
    </mj-style>
  </mj-head>
  <mj-body>
    <mj-section>
      <mj-column>
        <mj-text font-size="20px">{{headerText}}</mj-text>
      </mj-column>
    </mj-section>
    {{{content}}}
    {{#unless hideFooter}}
    <mj-section>
      <mj-column>
        <mj-text font-size="12px">Footer</mj-text>
      </mj-column>
    </mj-section>
    {{/unless}}
  </mj-body>
</mjml>`)

  // Create test template with layout
  fs.writeFileSync(path.join(deDir, 'test-layout.mjml'), `<!-- @meta
layout: base.mjml
title: "Test Email"
preview: "This is a test"
headerText: "Header from variable"
-->

<!-- @styles -->
.custom { color: red; }
<!-- @endstyles -->

<!-- @content -->
<mj-section>
  <mj-column>
    <mj-text>Hello {{name}}!</mj-text>
  </mj-column>
</mj-section>
<!-- @endcontent -->`)

  // Create test template without layout
  fs.writeFileSync(path.join(deDir, 'test-no-layout.mjml'), `<mjml>
  <mj-head>
    <mj-title>No Layout</mj-title>
  </mj-head>
  <mj-body>
    <mj-section>
      <mj-column>
        <mj-text>Hello {{name}} without layout!</mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`)

  return testDir
}

const cleanupTestDir = (testDir) => {
  fs.rmSync(testDir, { recursive: true, force: true })
}

describe('layout system', () => {
  let testDir, app

  beforeEach(async () => {
    testDir = createTestTemplates()
    app = await build({
      postalTransport: 'postal',
      postalTemplates: testDir
    })
  })

  afterEach(() => {
    if (testDir) {
      cleanupTestDir(testDir)
    }
  })

  test('should process template with layout', async () => {
    const html = app.compileHtmlBody('test-layout', { name: 'John' }, 'de')

    // Check that layout was applied
    assert.match(html, /Test Email/, 'should have title from layout variable')
    assert.match(html, /Header from variable/, 'should have header text from variable')
    assert.match(html, /Hello John!/, 'should have content with data')
    assert.match(html, /Footer/, 'should have footer from layout')
    assert.match(html, /\.custom.*color.*red/, 'should have custom styles')
  })

  test('should process template without layout', async () => {
    const html = app.compileHtmlBody('test-no-layout', { name: 'Jane' }, 'de')

    // Check that template works without layout
    assert.match(html, /No Layout/, 'should have original title')
    assert.match(html, /Hello Jane without layout!/, 'should have content with data')
    assert.doesNotMatch(html, /Footer/, 'should not have footer from layout')
  })

  test('should support relative layout paths', async () => {
    // Create template with relative layout path
    const relativeLayoutPath = path.join(testDir, 'de', 'test-relative-layout.mjml')
    fs.writeFileSync(relativeLayoutPath, `<!-- @meta
layout: ./layouts/base.mjml
title: "Relative Path Test"
headerText: "Relative Header"
-->
<mj-section>
  <mj-column>
    <mj-text>Content with relative layout</mj-text>
  </mj-column>
</mj-section>`)

    const html = app.compileHtmlBody('test-relative-layout', {}, 'de')

    // Check that layout was applied
    assert.match(html, /Relative Path Test/, 'should have title from layout')
    assert.match(html, /Relative Header/, 'should have header from variable')
    assert.match(html, /Content with relative layout/, 'should have content')
  })

  test('should handle missing layout gracefully', async () => {
    // Create template with non-existent layout
    const badLayoutPath = path.join(testDir, 'de', 'test-bad-layout.mjml')
    fs.writeFileSync(badLayoutPath, `<!-- @meta
layout: missing.mjml
-->
<mj-section>
  <mj-column>
    <mj-text>Content</mj-text>
  </mj-column>
</mj-section>`)

    const html = app.compileHtmlBody('test-bad-layout', {}, 'de')

    // Should still compile the template
    assert.match(html, /Content/, 'should compile template even with missing layout')
  })

  test('should handle layout without explicit content section', async () => {
    // Create template without @content tags
    const noContentPath = path.join(testDir, 'de', 'test-no-content.mjml')
    fs.writeFileSync(noContentPath, `<!-- @meta
layout: base.mjml
title: "No Content Tags"
-->
<mj-section>
  <mj-column>
    <mj-text>This has no content tags</mj-text>
  </mj-column>
</mj-section>`)

    const html = app.compileHtmlBody('test-no-content', {}, 'de')

    // Should use everything after layout declaration as content
    assert.match(html, /This has no content tags/, 'should use content after layout declaration')
  })

  test('should support hideFooter variable', async () => {
    // Create template that hides footer
    const noFooterPath = path.join(testDir, 'de', 'test-no-footer.mjml')
    fs.writeFileSync(noFooterPath, `<!-- @meta
layout: base.mjml
title: "No Footer"
-->
<!-- @content -->
<mj-section>
  <mj-column>
    <mj-text>Content</mj-text>
  </mj-column>
</mj-section>
<!-- @endcontent -->`)

    const html = app.compileHtmlBody('test-no-footer', { hideFooter: true }, 'de')

    assert.match(html, /Content/, 'should have content')
    // Check for footer text that's not part of the title
    assert.doesNotMatch(html, />Footer</, 'should not have footer text when hideFooter is true')
  })

  test('should handle single-quoted values in front matter', async () => {
    // Create template with single-quoted values
    const singleQuotePath = path.join(testDir, 'de', 'test-single-quotes.mjml')
    fs.writeFileSync(singleQuotePath, `<!-- @meta
layout: base.mjml
title: 'Single Quoted Title'
headerText: 'Header with Single Quotes'
-->
<mj-section>
  <mj-column>
    <mj-text>Content with single quotes</mj-text>
  </mj-column>
</mj-section>`)

    const html = app.compileHtmlBody('test-single-quotes', {}, 'de')

    // Check that single-quoted values work
    assert.match(html, /Single Quoted Title/, 'should parse single-quoted title')
    assert.match(html, /Header with Single Quotes/, 'should parse single-quoted header')
    assert.match(html, /Content with single quotes/, 'should have content')
  })

  test('should handle malformed front matter gracefully', async () => {
    // Create template with malformed front matter
    const malformedPath = path.join(testDir, 'de', 'test-malformed.mjml')
    fs.writeFileSync(malformedPath, `<!-- @meta
layout: base.mjml
title: "Test"
invalid line without quotes
another: invalid: line
-->
<mj-section>
  <mj-column>
    <mj-text>Content with malformed meta</mj-text>
  </mj-column>
</mj-section>`)

    const html = app.compileHtmlBody('test-malformed', {}, 'de')
    
    // Should still compile successfully, ignoring invalid lines
    assert.match(html, /Content with malformed meta/, 'should compile despite malformed front matter')
  })
})
