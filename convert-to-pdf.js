#!/usr/bin/env node

/**
 * HTML to PDF Converter for OnPoint MVP Scope Document
 * Usage: node convert-to-pdf.js
 */

const fs = require('fs');
const path = require('path');

async function convertHtmlToPdf() {
    try {
        // Try using puppeteer if available
        const puppeteer = require('puppeteer');
        
        const htmlFilePath = path.join(__dirname, 'docs', 'MVP-Scope-Final.html');
        const pdfFilePath = path.join(__dirname, 'docs', 'MVP-Scope-Final.pdf');
        
        if (!fs.existsSync(htmlFilePath)) {
            console.error(`HTML file not found: ${htmlFilePath}`);
            process.exit(1);
        }
        
        console.log('📄 Starting PDF conversion...');
        console.log(`Input: ${htmlFilePath}`);
        console.log(`Output: ${pdfFilePath}`);
        
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Load the HTML file
        const fileUrl = `file://${htmlFilePath.replace(/\\/g, '/')}`;
        await page.goto(fileUrl, { waitUntil: 'networkidle2' });
        
        // Generate PDF with optimal settings
        await page.pdf({
            path: pdfFilePath,
            format: 'A4',
            margin: {
                top: '20mm',
                right: '15mm',
                bottom: '20mm',
                left: '15mm'
            },
            printBackground: true,
            scale: 1
        });
        
        await browser.close();
        
        console.log('✅ PDF generated successfully!');
        console.log(`📁 File saved to: ${pdfFilePath}`);
        
    } catch (err) {
        if (err.code === 'MODULE_NOT_FOUND') {
            console.log('⚠️  Puppeteer not installed. Installing...');
            const { execSync } = require('child_process');
            
            try {
                execSync('npm install puppeteer', { stdio: 'inherit', cwd: __dirname });
                console.log('✅ Puppeteer installed. Re-running conversion...');
                // Recursively call after installation
                await convertHtmlToPdf();
            } catch (installErr) {
                console.error('❌ Failed to install puppeteer:', installErr.message);
                console.log('\n📌 Alternative: You can convert the HTML to PDF manually:');
                console.log('   1. Open docs/MVP-Scope-Final.html in your browser');
                console.log('   2. Press Ctrl+P or Cmd+P to open Print dialog');
                console.log('   3. Select "Save as PDF" and click Save');
                process.exit(1);
            }
        } else {
            console.error('❌ Conversion failed:', err.message);
            process.exit(1);
        }
    }
}

// Run the conversion
convertHtmlToPdf();
