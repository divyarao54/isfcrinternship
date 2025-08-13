const puppeteer = require('puppeteer');

async function scrapeCitationsPerYear(profileUrl) {
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920x1080'
    ]
  });
  const page = await browser.newPage();
  
  // Set longer timeout and user agent
  await page.setDefaultTimeout(60000); // 60 seconds
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  
  try {
    console.log(`[CITATIONS] Navigating to: ${profileUrl}`);
    await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Wait for page to load and try multiple selectors for stats table
    const statsSelectors = [
      '#gsc_rsb_st',
      '.gsc_rsb_st',
      '#gsc_rsb_st tbody',
      '.gsc_rsb_st tbody',
      'table.gsc_rsb_st',
      'div#gsc_rsb_st'
    ];
    
    let statsTableFound = false;
    for (const selector of statsSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 10000 });
        console.log(`[CITATIONS] Found stats table with selector: ${selector}`);
        statsTableFound = true;
        break;
      } catch (e) {
        console.log(`[CITATIONS] Selector ${selector} not found, trying next...`);
      }
    }
    
    if (!statsTableFound) {
      console.log('[CITATIONS] No stats table found, trying to wait for page load...');
      await page.waitForTimeout(5000); // Wait 5 seconds for page to load
    }
    
    // Check if histogram exists using the correct selector
    const histogramExists = await page.$('#gsc_rsb_cit > div > div.gsc_md_hist_w');
    
    let citationsPerYear = {};
    
    if (histogramExists) {
      console.log('[CITATIONS] Found citations histogram, scraping years and counts...');
      
      // Scrape years using the correct selector
      const years = await page.$$eval('#gsc_rsb_cit > div > div.gsc_md_hist_w > div > span', els => 
        els.map(e => e.textContent.trim()).filter(text => text && /^\d{4}$/.test(text))
      );
      
      // Scrape citation counts using the correct selector
      const counts = await page.$$eval('#gsc_rsb_cit > div > div.gsc_md_hist_w > div > a > span', els => 
        els.map(e => e.textContent.trim()).filter(text => text && /^\d+$/.test(text))
      );

      console.log(`[CITATIONS] Found ${years.length} years:`, years);
      console.log(`[CITATIONS] Found ${counts.length} counts:`, counts);

      if (years.length !== counts.length) {
        console.warn('Warning: Number of years and citation counts do not match.');
      }

      // Build the result as an object { year: count }
      for (let i = 0; i < Math.min(years.length, counts.length); i++) {
        citationsPerYear[years[i]] = parseInt(counts[i], 10) || 0;
      }
      console.log(`[CITATIONS] Scraped ${Object.keys(citationsPerYear).length} years of citations:`, citationsPerYear);
    } else {
      console.log('No citations histogram found - profile may have no citations');
    }

    // Scrape h-index and i10-index using the correct selectors
    let hIndex = 0;
    let i10Index = 0;
    
    try {
      // Use the exact selectors provided
      const hIndexSelectors = [
        '#gsc_rsb_st > tbody > tr:nth-child(2) > td:nth-child(2)',
        '#gsc_rsb_st tbody tr:nth-child(2) td:nth-child(2)',
        '.gsc_rsb_st tbody tr:nth-child(2) td:nth-child(2)',
        '#gsc_rsb_st tr:nth-child(2) td:nth-child(2)',
        'table.gsc_rsb_st tr:nth-child(2) td:nth-child(2)',
        '.gsc_rsb_st tr:nth-child(2) td:nth-child(2)'
      ];
      
      for (const selector of hIndexSelectors) {
        try {
          const hIndexElement = await page.$(selector);
          if (hIndexElement) {
            const hIndexText = await page.evaluate(el => el.textContent.trim(), hIndexElement);
            hIndex = parseInt(hIndexText, 10) || 0;
            if (hIndex > 0) {
              console.log(`[CITATIONS] Found h-index: ${hIndex} with selector: ${selector}`);
              break;
            }
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      // Use the exact selectors provided for i10-index
      const i10IndexSelectors = [
        '#gsc_rsb_st > tbody > tr:nth-child(3) > td:nth-child(2)',
        '#gsc_rsb_st tbody tr:nth-child(3) td:nth-child(2)',
        '.gsc_rsb_st tbody tr:nth-child(3) td:nth-child(2)',
        '#gsc_rsb_st tr:nth-child(3) td:nth-child(2)',
        'table.gsc_rsb_st tr:nth-child(3) td:nth-child(2)',
        '.gsc_rsb_st tr:nth-child(3) td:nth-child(2)'
      ];
      
      for (const selector of i10IndexSelectors) {
        try {
          const i10IndexElement = await page.$(selector);
          if (i10IndexElement) {
            const i10IndexText = await page.evaluate(el => el.textContent.trim(), i10IndexElement);
            i10Index = parseInt(i10IndexText, 10) || 0;
            if (i10Index > 0) {
              console.log(`[CITATIONS] Found i10-index: ${i10Index} with selector: ${selector}`);
              break;
            }
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      console.log(`[CITATIONS] Final scraped values - h-index: ${hIndex}, i10-index: ${i10Index}`);
    } catch (err) {
      console.error('Error scraping h-index and i10-index:', err);
    }

    return {
      citationsPerYear,
      hIndex: parseInt(hIndex, 10) || 0,
      i10Index: parseInt(i10Index, 10) || 0
    };
  } catch (err) {
    console.error('Error scraping citations per year:', err);
    return { citationsPerYear: {}, hIndex: 0, i10Index: 0 };
  } finally {
    await browser.close();
  }
}

module.exports = { scrapeCitationsPerYear };

// Usage: node scholarCitationsPerYear.js <profileUrl>
if (require.main === module) {
  const profileUrl = process.argv[2];
  if (!profileUrl) {
    console.error('Usage: node scholarCitationsPerYear.js <GoogleScholarProfileURL>');
    process.exit(1);
  }
  scrapeCitationsPerYear(profileUrl).then(result => {
    console.log(JSON.stringify(result, null, 2));
  });
} 