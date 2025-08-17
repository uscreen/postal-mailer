import fs from 'node:fs'
import path from 'node:path'
import tap from 'tap'
import { build } from './helper.js'

// Create test templates with layout
const createTestTemplates = (t) => {
  const testDir = t.testdir({
    de: {
      'layouts': {
        'base.mjml': `<mjml>
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
</mjml>`
      },
      'test-layout.mjml': `<!-- @meta
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
<!-- @endcontent -->`,
      'test-no-layout.mjml': `<mjml>
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
</mjml>`
    }
  })

  return testDir
}

tap.test('layout system', async (t) => {
  const testDir = createTestTemplates(t)
  const app = await build(t, {
    postalTransport: 'postal',
    postalTemplates: testDir
  })

  t.test('should process template with layout', async (t) => {
    const html = app.compileHtmlBody('test-layout', { name: 'John' }, 'de')

    // Check that layout was applied
    t.match(html, /Test Email/, 'should have title from layout variable')
    t.match(html, /Header from variable/, 'should have header text from variable')
    t.match(html, /Hello John!/, 'should have content with data')
    t.match(html, /Footer/, 'should have footer from layout')
    t.match(html, /\.custom.*color.*red/, 'should have custom styles')
  })

  t.test('should process template without layout', async (t) => {
    const html = app.compileHtmlBody('test-no-layout', { name: 'Jane' }, 'de')

    // Check that template works without layout
    t.match(html, /No Layout/, 'should have original title')
    t.match(html, /Hello Jane without layout!/, 'should have content with data')
    t.notMatch(html, /Footer/, 'should not have footer from layout')
  })

  t.test('should support relative layout paths', async (t) => {
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
    t.match(html, /Relative Path Test/, 'should have title from layout')
    t.match(html, /Relative Header/, 'should have header from variable')
    t.match(html, /Content with relative layout/, 'should have content')
  })

  t.test('should handle missing layout gracefully', async (t) => {
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
    t.match(html, /Content/, 'should compile template even with missing layout')
  })

  t.test('should handle layout without explicit content section', async (t) => {
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
    t.match(html, /This has no content tags/, 'should use content after layout declaration')
  })

  t.test('should support hideFooter variable', async (t) => {
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

    t.match(html, /Content/, 'should have content')
    // Check for footer text that's not part of the title
    t.notMatch(html, />Footer</, 'should not have footer text when hideFooter is true')
  })

  t.test('should handle single-quoted values in front matter', async (t) => {
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
    t.match(html, /Single Quoted Title/, 'should parse single-quoted title')
    t.match(html, /Header with Single Quotes/, 'should parse single-quoted header')
    t.match(html, /Content with single quotes/, 'should have content')
  })

  t.test('should handle malformed front matter gracefully', async (t) => {
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
    t.match(html, /Content with malformed meta/, 'should compile despite malformed front matter')
  })
})
