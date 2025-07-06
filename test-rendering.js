#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const postalMailer = require('./index')

// Create output directory
const outputDir = path.join(__dirname, 'test-output')
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir)
}

// Initialize mailer
const mailer = postalMailer({
  postalTemplates: path.join(__dirname, 'examples/templates'),
  postalServer: 'test',
  postalKey: 'test',
  postalSender: 'test@example.com',
  postalDefaultLocale: 'de',
  postalAssetsUrl: 'https://example.com/assets'
})

// Test data
const testData = {
  user: {
    firstName: 'Max',
    lastName: 'Mustermann'
  },
  // For layout-based templates
  accountFirstname: 'Max',
  accountLastname: 'Mustermann',
  fromFirstname: 'Anna',
  fromLastname: 'Schmidt',
  toMessage: 'Ich freue mich auf die Zusammenarbeit mit Ihnen!',
  action_url: 'https://example.com/invite/abc123',
  action_url_with_breaks: 'https://example.com/<wbr>invite/<wbr>abc123'
}

console.log('🎨 Email Template Rendering Test\n')
console.log('This will render both old-style and layout-based templates for comparison.\n')

// Test cases
const tests = [
  {
    name: 'Old Style Template (German)',
    template: 'test',
    locale: 'de',
    output: 'old-style-de.html'
  },
  {
    name: 'Old Style Template (English)',
    template: 'test',
    locale: 'en',
    output: 'old-style-en.html'
  },
  {
    name: 'Layout-Based Template (German)',
    template: 'test-with-layout',
    locale: 'de',
    output: 'layout-based-de.html'
  },
  {
    name: 'Layout-Based Template (English)',
    template: 'test-with-layout',
    locale: 'en',
    output: 'layout-based-en.html'
  }
]

// Run tests
tests.forEach(test => {
  try {
    console.log(`📧 Rendering: ${test.name}`)
    
    const html = mailer.compileHtmlBody(test.template, testData, test.locale)
    const outputPath = path.join(outputDir, test.output)
    
    // Wrap in a simple HTML viewer with side-by-side comparison capability
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${test.name}</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
            font-family: Arial, sans-serif;
        }
        .header {
            background: white;
            padding: 20px;
            margin-bottom: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header h1 {
            margin: 0 0 10px 0;
            color: #333;
        }
        .header p {
            margin: 0;
            color: #666;
        }
        .email-container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .email-frame {
            width: 100%;
            height: 800px;
            border: none;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${test.name}</h1>
        <p>Template: <code>${test.template}</code> | Locale: <code>${test.locale}</code></p>
    </div>
    <div class="email-container">
        <iframe class="email-frame" srcdoc="${html.replace(/"/g, '&quot;')}"></iframe>
    </div>
</body>
</html>`
    
    fs.writeFileSync(outputPath, fullHtml)
    console.log(`   ✅ Saved to: ${outputPath}`)
    
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`)
  }
})

// Create comparison page
const comparisonHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Email Template Comparison</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
            font-family: Arial, sans-serif;
        }
        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 30px;
        }
        .comparison-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 40px;
        }
        .template-box {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .template-header {
            background: #333;
            color: white;
            padding: 15px;
            text-align: center;
            font-weight: bold;
        }
        .template-frame {
            width: 100%;
            height: 600px;
            border: none;
        }
        .section-title {
            font-size: 24px;
            color: #333;
            margin: 30px 0 20px;
            text-align: center;
            border-bottom: 2px solid #ddd;
            padding-bottom: 10px;
        }
    </style>
</head>
<body>
    <h1>📧 Email Template Comparison</h1>
    
    <div class="section-title">German Templates</div>
    <div class="comparison-grid">
        <div class="template-box">
            <div class="template-header">Old Style (test.mjml)</div>
            <iframe class="template-frame" src="old-style-de.html"></iframe>
        </div>
        <div class="template-box">
            <div class="template-header">With Layout (test-with-layout.mjml)</div>
            <iframe class="template-frame" src="layout-based-de.html"></iframe>
        </div>
    </div>
    
    <div class="section-title">English Templates</div>
    <div class="comparison-grid">
        <div class="template-box">
            <div class="template-header">Old Style (test.mjml)</div>
            <iframe class="template-frame" src="old-style-en.html"></iframe>
        </div>
        <div class="template-box">
            <div class="template-header">With Layout (test-with-layout.mjml)</div>
            <iframe class="template-frame" src="layout-based-en.html"></iframe>
        </div>
    </div>
</body>
</html>`

const comparisonPath = path.join(outputDir, 'comparison.html')
fs.writeFileSync(comparisonPath, comparisonHtml)

console.log('\n🎉 All templates rendered successfully!')
console.log('\n📂 Output files:')
console.log(`   ${outputDir}/`)
tests.forEach(test => {
  console.log(`   ├── ${test.output}`)
})
console.log(`   └── comparison.html`)

console.log('\n👀 To view the comparison:')
console.log(`   open ${comparisonPath}`)
console.log('\n💡 Tip: The comparison.html file shows all templates side-by-side!')