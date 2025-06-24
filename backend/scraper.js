const puppeteer = require('puppeteer');
const Paper = require('./models/Paper');
const Teacher = require('./models/Teacher');
const connectDB = require('./config/db');
const fs = require('fs');
const mongoose = require('mongoose');
const paperSchema = require('./models/Paper').schema; // Import the schema only

// List of authors with their Google Scholar profile URLs
let authors = [
  {
    profileUrl: "https://scholar.google.com/citations?user=GF0YZuUAAAAJ&hl=en&oi=ao"
  },
  {
    profileUrl: "https://scholar.google.com/citations?user=Brfm5C4AAAAJ&hl=en&oi=ao"
  }
];

// Accept a Google Scholar profile link as a command-line argument
const inputProfileUrl = process.argv[2];
if (inputProfileUrl) {
  authors = [{ profileUrl: inputProfileUrl }];
}

// Function to extract teacher details from profile URL
async function getTeacherDetails(page, profileUrl) {
  try {
    await page.goto(profileUrl, { waitUntil: 'networkidle2' });
    
    // Get teacher name
    const nameElement = await page.$('#gsc_prf_in');
    const name = nameElement ? await page.evaluate(el => el.textContent.trim(), nameElement) : 'Unknown';
    
    // Get teacher photo
    const photoElement = await page.$('#gsc_prf_pup-img');
    let photoUrl = '';
    if (photoElement) {
      photoUrl = await page.evaluate(el => el.src, photoElement);
    }
    
    console.log(`Found teacher: ${name}`);
    console.log(`Photo URL: ${photoUrl || 'No photo available'}`);
    
    // Save teacher details to MongoDB
    try {
      const teacher = await Teacher.findOneAndUpdate(
        { profileUrl: profileUrl },
        {
          name: name,
          photoUrl: photoUrl,
          lastUpdated: new Date()
        },
        { upsert: true, new: true }
      );
      
      console.log('[SUCCESS] Successfully saved teacher details to MongoDB');
      console.log('[INFO] MongoDB Document ID:', teacher._id);
      
      return { name, photoUrl };
    } catch (error) {
      console.error('[ERROR] Error saving teacher details to MongoDB:', error.message);
      return { name: 'Unknown', photoUrl: '' };
    }
  } catch (error) {
    console.error('Error getting teacher details:', error);
    return { name: 'Unknown', photoUrl: '' };
  }
}

// Function to extract teacher name from profile URL
async function getTeacherName(page, profileUrl) {
  try {
    await page.goto(profileUrl, { waitUntil: 'networkidle2' });
    const nameElement = await page.$('#gsc_prf_in');
    const name = nameElement ? await page.evaluate(el => el.textContent.trim(), nameElement) : 'Unknown';
    return name;
  } catch (error) {
    console.error('Error getting teacher name:', error);
    return 'Unknown';
  }
}

// Function to get Chrome path on Windows
function getChromePath() {
  const paths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
  ];
  
  for (const path of paths) {
    if (fs.existsSync(path)) {
      return path;
    }
  }
  return null;
}

// Utility to sanitize collection names (MongoDB restrictions)
function sanitizeCollectionName(name) {
  return 'papers_' + name.toLowerCase().replace(/[^a-z0-9]/gi, '_');
}

// Cache for dynamic models
const teacherPaperModels = {};

function getTeacherPaperModel(teacherName) {
  const collectionName = sanitizeCollectionName(teacherName);
  if (!teacherPaperModels[collectionName]) {
    teacherPaperModels[collectionName] = mongoose.model(
      collectionName,
      paperSchema,
      collectionName
    );
  }
  return teacherPaperModels[collectionName];
}

async function scrapePaperDetails(page, paperUrl, citationCount, source, year, teacherName) {
  try {
    console.log('\n[PAPER] Processing paper:', paperUrl);
    await page.goto(paperUrl, { waitUntil: 'networkidle2' });

    // Get the title from the title element
    const titleElement = await page.$('#gsc_oci_title');
    const title = titleElement ? await page.evaluate(el => el.textContent.trim(), titleElement) : '';

    // Get the PDF link if available
    const pdfLinkElement = await page.$('#gsc_oci_title_gg a');
    const pdfLink = pdfLinkElement ? await page.evaluate(el => el.href, pdfLinkElement) : '';

    await page.waitForSelector('#gsc_oci_table');
    const rows = await page.$$('#gsc_oci_table .gs_scl');
    console.log(`[INFO] Found ${rows.length} details in the table`);

    // Initialize paper details with required fields
    const details = {
      title: title || 'Untitled', // Required field
      url: paperUrl, // Required field
      teacherName: teacherName, // Added teacher name
      authors: 'Unknown Authors',
      source: '',
      journal: '',
      conference: '',
      book: '',
      year: year || '',
      volume: '',
      issue: '',
      pages: '',
      publisher: '',
      description: '',
      summary: '', // Added summary field
      pdfLink: pdfLink || '',
      citationCount: citationCount || 0,
      publicationDate: ''
    };

    // Process each row
    for (const row of rows) {
      try {
        const fieldElement = await row.$('.gsc_oci_field');
        const valueElement = await row.$('.gsc_oci_value');
        
        if (fieldElement && valueElement) {
          const field = await page.evaluate(el => el.textContent.trim(), fieldElement);
          const value = await page.evaluate(el => el.textContent.trim(), valueElement);

          // Map fields to our details object
          switch (field.toLowerCase()) {
            case 'authors':
              details.authors = value || 'Unknown Authors';
              break;
            case 'source':
              details.source = value || '';
              break;
            case 'journal':
              details.journal = value || '';
              break;
            case 'conference':
              details.conference = value || '';
              break;
            case 'book':
              details.book = value || '';
              break;
            case 'volume':
              details.volume = value || '';
              break;
            case 'issue':
              details.issue = value || '';
              break;
            case 'pages':
              details.pages = value || '';
              break;
            case 'publisher':
              details.publisher = value || '';
              break;
            case 'description':
              details.description = value || '';
              break;
            case 'publication date':
              details.publicationDate = value || '';
              break;
          }
        }
      } catch (error) {
        console.log(`⚠️ Error processing row: ${error.message}`);
      }
    }

    // Print formatted paper details with all fields
    console.log('\n📑 Paper Details:');
    console.log('----------------');
    console.log(`Title: ${details.title}`);
    console.log(`PDF Link: ${details.pdfLink || 'N/A'}`);
    console.log(`Authors: ${details.authors}`);
    console.log(`Source: ${details.source || 'N/A'}`);
    console.log(`Journal: ${details.journal || 'N/A'}`);
    console.log(`Conference: ${details.conference || 'N/A'}`);
    console.log(`Book: ${details.book || 'N/A'}`);
    console.log(`Year: ${details.year || 'N/A'}`);
    console.log(`Publication Date: ${details.publicationDate || 'N/A'}`);
    console.log(`Volume: ${details.volume || 'N/A'}`);
    console.log(`Issue: ${details.issue || 'N/A'}`);
    console.log(`Pages: ${details.pages || 'N/A'}`);
    console.log(`Publisher: ${details.publisher || 'N/A'}`);
    console.log(`Citations: ${details.citationCount}`);
    console.log(`URL: ${details.url}`);
    console.log('\nDescription:');
    console.log(details.description || 'N/A');
    console.log('----------------\n');

    // Save to MongoDB
    try {
      const PaperModel = getTeacherPaperModel(details.teacherName);
      // Try to find existing paper
      const existingPaper = await PaperModel.findOne({ url: details.url });
      
      if (existingPaper) {
        // Update only the changing fields
        existingPaper.citationCount = details.citationCount;
        existingPaper.pdfLink = details.pdfLink || existingPaper.pdfLink;
        existingPaper.description = details.description || existingPaper.description;
        
        // Update other fields if they were empty before
        if (!existingPaper.source && details.source) existingPaper.source = details.source;
        if (!existingPaper.journal && details.journal) existingPaper.journal = details.journal;
        if (!existingPaper.conference && details.conference) existingPaper.conference = details.conference;
        if (!existingPaper.book && details.book) existingPaper.book = details.book;
        if (!existingPaper.volume && details.volume) existingPaper.volume = details.volume;
        if (!existingPaper.issue && details.issue) existingPaper.issue = details.issue;
        if (!existingPaper.pages && details.pages) existingPaper.pages = details.pages;
        if (!existingPaper.publisher && details.publisher) existingPaper.publisher = details.publisher;
        if (!existingPaper.publicationDate && details.publicationDate) existingPaper.publicationDate = details.publicationDate;
        
        await existingPaper.save();
        console.log('[SUCCESS] Successfully updated existing paper in MongoDB');
        console.log('[INFO] MongoDB Document ID:', existingPaper._id);
      } else {
        // Create new paper if it doesn't exist
        const paper = new PaperModel(details);
        await paper.save();
        console.log('[SUCCESS] Successfully saved new paper to MongoDB');
        console.log('[INFO] MongoDB Document ID:', paper._id);
      }
    } catch (error) {
      console.error('[ERROR] Error saving to MongoDB:', error.message);
      if (error.name === 'ValidationError') {
        console.error('Validation errors:', error.errors);
      }
    }

    return details;
  } catch (error) {
    console.error(`[ERROR] Error scraping paper details: ${error.message}`);
    return null;
  }
}

async function scrapeAuthor(author) {
  try {
    console.log(`\n[START] Starting to scrape author profile: ${author.profileUrl}`);
    const browser = await puppeteer.launch({
      headless: "new",
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
    
    // Optimize page performance but allow necessary resources
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      if (resourceType === 'image' || 
          resourceType === 'font' || 
          resourceType === 'media') {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    // Get teacher details from profile
    const teacherDetails = await getTeacherDetails(page, author.profileUrl);
    console.log(`Found teacher name: ${teacherDetails.name}`);
    
    await page.goto(author.profileUrl, { waitUntil: 'networkidle2' });
    await page.waitForSelector('.gsc_a_tr');
    console.log('Found publications table');

    let hasMore = true;
    let clickCount = 0;
    const maxClicks = 20;
    
    while (hasMore && clickCount < maxClicks) {
      try {
        const showMoreButton = await page.$('#gsc_bpf_more');
        if (showMoreButton) {
          // Wait for button to be clickable
          await page.waitForFunction(
            () => {
              const button = document.querySelector('#gsc_bpf_more');
              return button && !button.disabled;
            },
            { timeout: 5000 }
          );
          
          // Click the button
          await showMoreButton.click();
          clickCount++;
          console.log(`Clicked "Show more" button (${clickCount}/${maxClicks})`);
          
          // Wait for new content to load
          await page.waitForTimeout(1000);
        } else {
          console.log('No more "Show more" button found');
          hasMore = false;
        }
      } catch (error) {
        console.log('Error clicking "Show more" button:', error.message);
        hasMore = false;
      }
    }

    console.log(`Finished loading papers after ${clickCount} "Show more" clicks`);
    
    // Wait for all publications to load
    await page.waitForSelector('.gsc_a_tr', { timeout: 5000 });
    const publications = await page.$$('.gsc_a_tr');
    console.log(`Found ${publications.length} total publications`);

    const paperLinks = await page.evaluate(() => {
      const links = [];
      const rows = document.querySelectorAll('.gsc_a_tr');
      rows.forEach(row => {
        const link = row.querySelector('.gsc_a_t a')?.href;
        const citationCount = row.querySelector('.gsc_a_c a')?.textContent?.trim() || '0';
        const source = row.querySelector('.gsc_a_t div')?.textContent?.trim() || '';
        const year = row.querySelector('.gsc_a_y')?.textContent?.trim() || '';
        if (link) {
          links.push({ 
            url: link, 
            citationCount: parseInt(citationCount) || 0,
            source: source,
            year: year
          });
        }
      });
      return links;
    });
    console.log(`Found ${paperLinks.length} paper links`);
    let successfulScrapes = 0;
    let failedScrapes = 0;
    let authorDetails = [];
    for (const paper of paperLinks) {
      try {
        const details = await scrapePaperDetails(page, paper.url, paper.citationCount, paper.source, paper.year, teacherDetails.name);
        if (details) {
          successfulScrapes++;
          authorDetails.push(details);
        } else {
          failedScrapes++;
        }
      } catch (error) {
        console.error(`Error processing paper ${paper.url}:`, error);
        failedScrapes++;
      }
    }
    console.log('\n[SUMMARY] Scraping Summary:');
    console.log('----------------');
    console.log(`Total papers processed: ${publications.length}`);
    console.log(`Successfully scraped: ${successfulScrapes}`);
    console.log(`Failed scrapes: ${failedScrapes}`);
    console.log('----------------\n');
    await browser.close();
    return authorDetails;
  } catch (error) {
    console.error(`[ERROR] Error scraping author: ${error.message}`);
    return [];
  }
}

async function scrapeAndStorePapers() {
  let browser;
  try {
    // Ensure MongoDB connection before starting
    await connectDB();
    
    // Launch browser with optimized settings
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080',
        '--disable-extensions',
        '--disable-component-extensions-with-background-pages',
        '--disable-default-apps',
        '--mute-audio',
        '--no-default-browser-check',
        '--no-first-run',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-breakpad',
        '--disable-client-side-phishing-detection',
        '--disable-hang-monitor',
        '--disable-ipc-flooding-protection',
        '--disable-popup-blocking',
        '--disable-prompt-on-repost',
        '--disable-renderer-backgrounding',
        '--disable-sync',
        '--force-color-profile=srgb',
        '--metrics-recording-only',
        '--no-experiments',
        '--safebrowsing-disable-auto-update'
      ]
    });

    const page = await browser.newPage();
    
    // Optimize page performance
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      if (resourceType === 'image' || 
          resourceType === 'stylesheet' || 
          resourceType === 'font' || 
          resourceType === 'media' || 
          resourceType === 'other') {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    // Set default timeout
    page.setDefaultTimeout(30000); // 30 seconds timeout

    let allPublications = [];
    for (const author of authors) {
      console.log(`\nScraping publications for ${author.profileUrl}...`);
      const publications = await scrapeAuthor(author);
      allPublications = allPublications.concat(publications);
      console.log(`Found ${allPublications.length} publications for ${author.profileUrl}`);
    }

    // Optimize MongoDB operations with individual saves
    if (allPublications.length > 0) {
      console.log('Storing papers in MongoDB...');
      console.log(`Total publications found: ${allPublications.length}`);
      
      // Ensure MongoDB connection is still active
      if (mongoose.connection.readyState !== 1) {
        console.log('MongoDB connection lost, reconnecting...');
        await connectDB();
      }
      
      let savedCount = 0;
      let updatedCount = 0;
      let errorCount = 0;
      
      // Use individual saves for better error handling
      for (const paper of allPublications) {
        try {
          if (!paper.title || !paper.url || !paper.teacherName) {
            console.error('[ERROR] Missing required fields:', {
              title: paper.title,
              url: paper.url,
              teacherName: paper.teacherName
            });
            errorCount++;
            continue;
          }
          const PaperModel = getTeacherPaperModel(paper.teacherName);
          // Check if paper already exists
          const existingPaper = await PaperModel.findOne({ url: paper.url });
          if (existingPaper) {
            // Update existing paper
            const updateData = {
              title: paper.title,
              teacherName: paper.teacherName,
              authors: paper.authors || 'Unknown Authors',
              source: paper.source,
              journal: paper.journal,
              conference: paper.conference,
              book: paper.book,
              year: paper.year,
              volume: paper.volume,
              issue: paper.issue,
              pages: paper.pages,
              publisher: paper.publisher,
              description: paper.description,
              summary: paper.summary,
              pdfLink: paper.pdfLink,
              citationCount: paper.citationCount || 0,
              publicationDate: paper.publicationDate
            };

            // Only update fields that have values
            Object.keys(updateData).forEach(key => {
              if (updateData[key] !== undefined && updateData[key] !== null) {
                existingPaper[key] = updateData[key];
              }
            });

            await existingPaper.save();
            updatedCount++;
            console.log(`[UPDATED] Updated paper: ${paper.title}`);
          } else {
            // Create new paper with all fields
            const newPaper = new PaperModel({
              title: paper.title,
              url: paper.url,
              teacherName: paper.teacherName,
              authors: paper.authors || 'Unknown Authors',
              source: paper.source || '',
              journal: paper.journal || '',
              conference: paper.conference || '',
              book: paper.book || '',
              year: paper.year || '',
              volume: paper.volume || '',
              issue: paper.issue || '',
              pages: paper.pages || '',
              publisher: paper.publisher || '',
              description: paper.description || '',
              summary: paper.summary || '',
              pdfLink: paper.pdfLink || '',
              citationCount: paper.citationCount || 0,
              publicationDate: paper.publicationDate || ''
            });

            await newPaper.save();
            savedCount++;
            console.log(`[SAVED] Saved new paper: ${paper.title}`);
          }
        } catch (saveError) {
          errorCount++;
          console.error(`[ERROR] Error saving paper ${paper.url}:`, saveError.message);
          if (saveError.name === 'ValidationError') {
            console.error('Validation errors:', saveError.errors);
          }
        }
      }
      
      console.log('\n[SUMMARY] MongoDB Save Summary:');
      console.log('----------------------');
      console.log(`New papers saved: ${savedCount}`);
      console.log(`Papers updated: ${updatedCount}`);
      console.log(`Errors: ${errorCount}`);
      console.log(`Total processed: ${allPublications.length}`);
      console.log('----------------------\n');
    } else {
      console.log('No publications to save!');
    }

    console.log('Scraping and storing completed successfully!');
    return allPublications;
  } catch (error) {
    console.error('Error during scraping:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Export the scraping function
module.exports = {
  scrapeAndStorePapers
};

// Main execution block - run if this file is executed directly
if (require.main === module) {
  console.log('Starting Google Scholar scraper...');
  if (inputProfileUrl) {
    console.log(`Using provided profile URL: ${inputProfileUrl}`);
  } else {
    console.log('No profile URL provided, using default authors list.');
  }
  scrapeAndStorePapers()
    .then((papers) => {
      console.log(`Scraping completed! Processed ${papers.length} papers.`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Scraping failed:', error);
      process.exit(1);
    });
} 