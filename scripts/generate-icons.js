/**
 * Generate PWA icons from source image
 * Requires: npm install sharp (or use online tool)
 */

const fs = require('fs')
const path = require('path')

const sourceImage = path.join(__dirname, '../public/ChatGPT Image 29 Νοε 2025, 08_13_35 μ.μ..png')
const outputDir = path.join(__dirname, '../public')

async function generateIcons() {
  try {
    // Try to use sharp if available
    let sharp
    try {
      sharp = require('sharp')
    } catch (e) {
      console.error('Sharp not found. Installing...')
      console.log('Please run: npm install sharp --save-dev')
      console.log('Or manually resize the image to:')
      console.log('  - icon-192.png (192x192)')
      console.log('  - icon-512.png (512x512)')
      return
    }

    if (!fs.existsSync(sourceImage)) {
      console.error('Source image not found:', sourceImage)
      return
    }

    console.log('Generating icons from:', sourceImage)

    // Generate 192x192 icon
    await sharp(sourceImage)
      .resize(192, 192, {
        fit: 'contain',
        background: { r: 74, g: 144, b: 226, alpha: 1 } // Blue background
      })
      .png()
      .toFile(path.join(outputDir, 'icon-192.png'))

    console.log('✓ Generated icon-192.png')

    // Generate 512x512 icon
    await sharp(sourceImage)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 74, g: 144, b: 226, alpha: 1 } // Blue background
      })
      .png()
      .toFile(path.join(outputDir, 'icon-512.png'))

    console.log('✓ Generated icon-512.png')
    console.log('Icons generated successfully!')
  } catch (error) {
    console.error('Error generating icons:', error)
    console.log('\nAlternative: Manually resize the image to:')
    console.log('  - icon-192.png (192x192 pixels)')
    console.log('  - icon-512.png (512x512 pixels)')
    console.log('  Place them in the public/ folder')
  }
}

generateIcons()

