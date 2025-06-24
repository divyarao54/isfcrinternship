const puppeteer = require('puppeteer');

async function scrapeCitations(profileUrl) {
    let browser;
    try {
        console.log(`Scraping citations from: ${profileUrl}`);
        
        browser = await puppeteer.launch({
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
        
        // Set user agent to avoid detection
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        // Navigate to the profile
        await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Wait for the citation section to load
        await page.waitForSelector('#gsc_rsb_cit', { timeout: 10000 });
        
        // Extract citation data from #gsc_rsb_cit > div elements
        const citationData = await page.evaluate(() => {
            const citationSection = document.querySelector('#gsc_rsb_cit');
            if (!citationSection) return null;
            
            const citations = {};
            
            // Extract basic citation stats
            const citationDivs = citationSection.querySelectorAll('div');
            citationDivs.forEach(div => {
                const text = div.textContent.trim();
                if (text) {
                    // Look for patterns like "Cited by X" or "h-index: X"
                    const citedByMatch = text.match(/Cited by (\d+)/);
                    const hIndexMatch = text.match(/h-index[:\s]*(\d+)/i);
                    const i10IndexMatch = text.match(/i10-index[:\s]*(\d+)/i);
                    
                    if (citedByMatch) {
                        citations.citedBy = citedByMatch[1];
                    }
                    if (hIndexMatch) {
                        citations.hIndex = hIndexMatch[1];
                    }
                    if (i10IndexMatch) {
                        citations.i10Index = i10IndexMatch[1];
                    }
                    
                    // Also capture any other numeric values that might be citation-related
                    const numericMatch = text.match(/(\d+)/);
                    if (numericMatch && !citations.citedBy && !citations.hIndex && !citations.i10Index) {
                        citations.totalCitations = numericMatch[1];
                    }
                }
            });
            
            // Extract citation histogram data
            const histogramData = {};
            const histogramContainer = document.querySelector('.gsc_g_hist_wrp');
            if (histogramContainer) {
                // Get years from the histogram
                const yearElements = histogramContainer.querySelectorAll('.gsc_g_t');
                const citationElements = histogramContainer.querySelectorAll('.gsc_g_al');
                
                const years = Array.from(yearElements).map(el => el.textContent.trim());
                const citations = Array.from(citationElements).map(el => el.textContent.trim());
                
                // Create year-citation pairs
                for (let i = 0; i < years.length && i < citations.length; i++) {
                    histogramData[years[i]] = citations[i];
                }
                
                citations.citationHistogram = histogramData;
            }
            
            return citations;
        });
        
        // If no structured data found, try alternative selectors
        if (!citationData || Object.keys(citationData).length === 0) {
            const alternativeData = await page.evaluate(() => {
                const citations = {};
                
                // Try different selectors for citation information
                const gscStats = document.querySelectorAll('.gsc_rsb_std');
                gscStats.forEach(stat => {
                    const text = stat.textContent.trim();
                    const label = stat.querySelector('.gsc_rsb_label');
                    const value = stat.querySelector('.gsc_rsb_val');
                    
                    if (label && value) {
                        const labelText = label.textContent.trim().toLowerCase();
                        const valueText = value.textContent.trim();
                        
                        if (labelText.includes('cited by')) {
                            citations.citedBy = valueText;
                        } else if (labelText.includes('h-index')) {
                            citations.hIndex = valueText;
                        } else if (labelText.includes('i10-index')) {
                            citations.i10Index = valueText;
                        }
                    }
                });
                
                return citations;
            });
            
            if (alternativeData && Object.keys(alternativeData).length > 0) {
                console.log('Found citation data using alternative method');
                console.log(JSON.stringify(alternativeData));
                return alternativeData;
            }
        }
        
        if (citationData && Object.keys(citationData).length > 0) {
            console.log('Found citation data');
            console.log(JSON.stringify(citationData));
            return citationData;
        } else {
            console.log('No citation data found');
            return { error: 'No citation data available' };
        }
        
    } catch (error) {
        console.error('Error scraping citations:', error.message);
        return { error: error.message };
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Main execution
if (require.main === module) {
    const profileUrl = process.argv[2];
    if (!profileUrl) {
        console.error('Profile URL is required');
        process.exit(1);
    }
    
    scrapeCitations(profileUrl)
        .then(result => {
            console.log(JSON.stringify(result));
            process.exit(0);
        })
        .catch(error => {
            console.error('Scraping failed:', error);
            console.log(JSON.stringify({ error: error.message }));
            process.exit(1);
        });
}

module.exports = { scrapeCitations }; 