import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the brand configuration
const brandConfigPath = path.join(__dirname, '../src/config/brand.json');
const templatePath = path.join(__dirname, '../index.template.html');
const outputPath = path.join(__dirname, '../index.html');

try {
  // Read brand configuration
  const brandConfig = JSON.parse(fs.readFileSync(brandConfigPath, 'utf8'));
  const brand = brandConfig.brand;
  
  // Read HTML template
  const template = fs.readFileSync(templatePath, 'utf8');
  
  // Replace placeholders with brand values
  let html = template
    .replace(/{{TITLE}}/g, brand.seo.title)
    .replace(/{{OG_TITLE}}/g, brand.seo.ogTitle)
    .replace(/{{DESCRIPTION}}/g, brand.seo.description)
    .replace(/{{OG_IMAGE}}/g, brand.seo.ogImage)
    .replace(/{{TWITTER_IMAGE}}/g, brand.seo.twitterImage)
    .replace(/{{DOMAIN}}/g, brand.domain)
    .replace(/{{FAVICON_BASE_URL}}/g, brand.favicon.baseUrl)
    .replace(/{{THEME_COLOR}}/g, brand.favicon.themeColor)
    .replace(/{{TILE_COLOR}}/g, brand.favicon.tileColor);
  
  // Write the generated HTML
  fs.writeFileSync(outputPath, html, 'utf8');
  
  console.log('✅ index.html generated successfully from brand configuration');
  console.log(`📄 Output: ${outputPath}`);
  
} catch (error) {
  console.error('❌ Error generating HTML:', error.message);
  process.exit(1);
}