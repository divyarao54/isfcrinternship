const puppeteer = require('puppeteer');
const Teacher = require('./models/Teacher');
const Domain = require('./models/Domain');
const connectDB = require('./config/db');
const fs = require('fs');
const mongoose = require('mongoose');
const { schema: paperSchema } = require('./models/Paper'); // Import the schema only

// Try to import Citation model, but handle if it's not available
let Citation;
try {
  Citation = require('./models/Citation');
} catch (error) {
  console.warn('[WARNING] Citation model not available:', error.message);
  Citation = null;
}

const { scrapeCitationsPerYear } = require('./scholarCitationsPerYear');

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
    
    // Scrape domain information
    let domains = [];
    try {
      const domainElements = await page.$$('#gsc_prf_int > a');
      console.log(`[DOMAINS] Found ${domainElements.length} domain elements`);
      
      for (let i = 0; i < domainElements.length; i++) {
        try {
          const domainElement = domainElements[i];
          const domainName = await page.evaluate(el => el.textContent.trim(), domainElement);
          const domainUrl = await page.evaluate(el => el.href, domainElement);
          
          if (domainName && domainName.trim()) {
            domains.push({
              domainName: domainName.trim(),
              domainUrl: domainUrl || ''
            });
            console.log(`[DOMAINS] Found domain: ${domainName} (URL: ${domainUrl || 'N/A'})`);
          }
        } catch (domainError) {
          console.error(`[DOMAINS] Error scraping domain ${i + 1}:`, domainError.message);
        }
      }
    } catch (domainError) {
      console.error('[DOMAINS] Error scraping domains:', domainError.message);
    }
    
    // Save teacher details to MongoDB
    try {
      // Only check for existing teacher by name
      console.log(`[DEBUG] Searching for existing teacher with name: ${name}`);
      let existingTeacher = await Teacher.findOne({ name: name });
      console.log(`[DEBUG] Existing teacher found by name:`, existingTeacher ? `Yes (ID: ${existingTeacher._id}, ProfileUrl: ${existingTeacher.profileUrl})` : 'No');
      
      if (existingTeacher) {
        // Only update photoUrl if it is missing or empty
        const updateFields = {
            name: name,
          profileUrl: profileUrl, // Always update profileUrl in case it changed
            lastUpdated: new Date()
        };
        if (!existingTeacher.photoUrl) {
          updateFields.photoUrl = photoUrl;
        }
        const updatedTeacher = await Teacher.findOneAndUpdate(
          { _id: existingTeacher._id }, // Use _id for precise update
          updateFields,
          { new: true }
        );
        
        console.log('[UPDATED] Successfully updated existing teacher in MongoDB');
        console.log('[INFO] MongoDB Document ID:', updatedTeacher._id);
        console.log(`[INFO] Updated teacher: ${name} (was: ${existingTeacher.name})`);
        
        // Save domains for existing teacher
        await saveDomains(name, domains);
        
        return { name, photoUrl };
      } else {
        // Create new teacher
        console.log(`[DEBUG] Creating new teacher with name: ${name}`);
        try {
          const newTeacher = await Teacher.findOneAndUpdate(
            { name: name },
            {
              name: name,
              profileUrl: profileUrl,
              photoUrl: photoUrl,
              lastUpdated: new Date()
            },
            { upsert: true, new: true }
          );
          
          console.log('[CREATED] Successfully created new teacher in MongoDB');
          console.log('[INFO] MongoDB Document ID:', newTeacher._id);
          
          // Save domains for new teacher
          await saveDomains(name, domains);
          
          return { name, photoUrl };
        } catch (upsertError) {
          // Handle unique constraint violation
          if (upsertError.code === 11000) {
            console.log('[DEBUG] Unique constraint violation detected, trying to find existing teacher again');
            const conflictTeacher = await Teacher.findOne({ name: name });
            if (conflictTeacher) {
              console.log('[UPDATED] Found conflicting teacher, updating instead');
              const updatedTeacher = await Teacher.findOneAndUpdate(
                { _id: conflictTeacher._id },
                {
                  name: name,
                  profileUrl: profileUrl,
                  photoUrl: photoUrl,
                  lastUpdated: new Date()
                },
                { new: true }
              );
              console.log('[UPDATED] Successfully updated conflicting teacher in MongoDB');
              console.log('[INFO] MongoDB Document ID:', updatedTeacher._id);
              
              // Save domains for conflicting teacher
              await saveDomains(name, domains);
              
              return { name, photoUrl };
            }
          }
          throw upsertError;
        }
      }
    } catch (error) {
      console.error('[ERROR] Error saving teacher details to MongoDB:', error.message);
      console.error('[ERROR] Full error:', error);
      return { name: 'Unknown', photoUrl: '' };
    }
  } catch (error) {
    console.error('Error getting teacher details:', error);
    return { name: 'Unknown', photoUrl: '' };
  }
}

// Function to save domains for a teacher
async function saveDomains(teacherName, domains) {
  if (!domains || domains.length === 0) {
    console.log(`[DOMAINS] No domains found for ${teacherName}`);
    return;
  }
  
  try {
    console.log(`[DOMAINS] Saving ${domains.length} domains for ${teacherName}`);
    
    for (const domain of domains) {
      try {
        // Use upsert to avoid duplicates
        await Domain.findOneAndUpdate(
          { 
            teacherName: teacherName,
            domainName: domain.domainName 
          },
          {
            teacherName: teacherName,
            domainName: domain.domainName,
            domainUrl: domain.domainUrl,
            lastUpdated: new Date()
          },
          { upsert: true, new: true }
        );
        
        console.log(`[DOMAINS] Saved domain: ${domain.domainName} for ${teacherName}`);
      } catch (domainError) {
        if (domainError.code === 11000) {
          console.log(`[DOMAINS] Domain ${domain.domainName} already exists for ${teacherName}`);
        } else {
          console.error(`[DOMAINS] Error saving domain ${domain.domainName}:`, domainError.message);
        }
      }
    }
    
    console.log(`[DOMAINS] Successfully saved all domains for ${teacherName}`);
  } catch (error) {
    console.error(`[DOMAINS] Error saving domains for ${teacherName}:`, error.message);
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

// Function to ensure Teacher collection has proper indexes
async function ensureTeacherIndexes() {
  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const teachersCollectionExists = collections.some(col => col.name === 'teachers');
    
    if (teachersCollectionExists) {
      // Check if unique index on profileUrl exists
      const indexes = await db.collection('teachers').indexes();
      const profileUrlIndex = indexes.find(idx => 
        idx.key && idx.key.profileUrl === 1 && idx.unique === true
      );
      
      if (!profileUrlIndex) {
        console.log('[INDEX] Creating unique index on profileUrl for teachers collection...');
        await db.collection('teachers').createIndex({ profileUrl: 1 }, { unique: true });
        console.log('[INDEX] Unique index on profileUrl created successfully');
      } else {
        console.log('[INDEX] Unique index on profileUrl already exists');
      }
    } else {
      console.log('[INDEX] Teachers collection does not exist yet, indexes will be created automatically');
    }
  } catch (error) {
    console.error('[INDEX] Error ensuring teacher indexes:', error.message);
  }
}

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

// Normalize publication type fields
function normalizePublicationType(details) {
  // Helper function to check for keywords
  function hasKeyword(value, keywords) {
    if (!value) return false;
    const lower = value.toLowerCase();
    return keywords.some(k => lower.includes(k));
  }
  // Conference keywords
  //const conferenceKeywords = ['conference', 'symposium', 'congress', 'meeting', 'colloquium', 'summit', 'forum', 'proceedings'];
  const conferenceKeywords = ['conference', 'proceedings'];
  // Journal keywords
  const journalKeywords = ['journal', 'transactions', 'letters', 'magazine', 'bulletin', 'review', 'annals'];
  // Book keywords
  const bookKeywords = ['book', 'handbook', 'textbook', 'monograph', 'encyclopedia'];

  // PRIORITY 1: Check title for conference keywords (highest priority)
  if (hasKeyword(details.title, conferenceKeywords)) {
    // If title contains conference keywords, prioritize conference classification
    if (details.book && hasKeyword(details.book, conferenceKeywords)) {
      details.conference = details.book;
      details.book = '';
    } else if (details.journal && hasKeyword(details.journal, conferenceKeywords)) {
      details.conference = details.journal;
      details.journal = '';
    } else if (details.source && hasKeyword(details.source, conferenceKeywords)) {
      details.conference = details.source;
      details.source = '';
    }
  }

  // PRIORITY 2: Check title for journal keywords
  if (hasKeyword(details.title, journalKeywords)) {
    // If title contains journal keywords, prioritize journal classification
    if (details.book && hasKeyword(details.book, journalKeywords)) {
      details.journal = details.book;
      details.book = '';
    } else if (details.conference && hasKeyword(details.conference, journalKeywords)) {
      details.journal = details.conference;
      details.conference = '';
    } else if (details.source && hasKeyword(details.source, journalKeywords)) {
      details.journal = details.source;
      details.source = '';
    }
  }

  // PRIORITY 3: Check title for book keywords
  if (hasKeyword(details.title, bookKeywords)) {
    // If title contains book keywords, prioritize book classification
    if (details.conference && hasKeyword(details.conference, bookKeywords)) {
      details.book = details.conference;
      details.conference = '';
    } else if (details.journal && hasKeyword(details.journal, bookKeywords)) {
      details.book = details.journal;
      details.journal = '';
    } else if (details.source && hasKeyword(details.source, bookKeywords)) {
      details.book = details.source;
      details.source = '';
    }
  }

  // PRIORITY 4: Field-based classification (existing logic)
  // If source looks like a conference
  if (hasKeyword(details.source, conferenceKeywords)) {
    details.conference = details.source;
    details.source = '';
  } else if (hasKeyword(details.source, journalKeywords)) {
    details.journal = details.source;
    details.source = '';
  } else if (hasKeyword(details.source, bookKeywords)) {
    details.book = details.source;
    details.source = '';
  }
  // If journal looks like a conference
  if (hasKeyword(details.journal, conferenceKeywords)) {
    details.conference = details.journal;
    details.journal = '';
  }
  // If conference looks like a journal
  if (hasKeyword(details.conference, journalKeywords)) {
    details.journal = details.conference;
    details.conference = '';
  }
  // If book looks like a journal
  if (hasKeyword(details.book, journalKeywords)) {
    details.journal = details.book;
    details.book = '';
  }
  // If book looks like a conference
  if (hasKeyword(details.book, conferenceKeywords)) {
    details.conference = details.book;
    details.book = '';
  }
  // If volume or issue is filled, treat as journal, unless conference keyword is present
  const hasConferenceKeyword = hasKeyword(details.source, conferenceKeywords) || hasKeyword(details.journal, conferenceKeywords) || hasKeyword(details.conference, conferenceKeywords) || hasKeyword(details.book, conferenceKeywords);
  if (!hasConferenceKeyword && ((details.volume && details.volume.trim() !== '') || (details.issue && details.issue.trim() !== ''))) {
    if (details.source) {
      details.journal = details.source;
      details.source = '';
    } else if (details.conference) {
      details.journal = details.conference;
      details.conference = '';
    } else if (details.book) {
      details.journal = details.book;
      details.book = '';
    }
  }
  // After all checks, if source is still non-empty, always move it to journal
  if (details.source) {
    details.journal = details.source;
    details.source = '';
  }
  // (You can add more rules as needed)
}

async function scrapePaperDetails(page, paperUrl, citationCount, source, year, teacherName) {
  try {
    console.log('\n[PAPER] Processing paper:', paperUrl);
    await page.goto(paperUrl, { waitUntil: 'networkidle2' });

    // Get the title from the title element
    const titleElement = await page.$('#gsc_oci_title');
    const title = titleElement ? await page.evaluate(el => el.textContent.trim(), titleElement) : '';

    // Get the PDF link using the new selector provided
    let pdfLink = '';
    const pdfLinkElement = await page.$('#gsc_oci_table > div:nth-child(8) > div.gsc_oci_value > div > div:nth-child(1) > a');
    if (pdfLinkElement) {
      pdfLink = await page.evaluate(el => el.href, pdfLinkElement);
    }
    // (Old selector is now removed/commented out)
    // const pdfLinkElement = await page.$('#gsc_oci_title_gg a');
    // const pdfLink = pdfLinkElement ? await page.evaluate(el => el.href, pdfLinkElement) : '';

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
      publicationDate: '',
      inventors: '',
      patentOffice: '',
      patentNumber: '',
      applicationNumber: '',
      patent: false // Initialize patent field
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
            case 'inventors':
              details.inventors = value || '';
              break;
            case 'patent office':
              details.patentOffice = value || '';
              break;
            case 'patent number':
              details.patentNumber = value || '';
              break;
            case 'application number':
              details.applicationNumber = value || '';
              break;
          }
        }
      } catch (error) {
        console.log(`⚠️ Error processing row: ${error.message}`);
      }
    }

    // Normalize before saving
    normalizePublicationType(details);

    // After processing all rows and before saving
    if (details.patentNumber && details.patentNumber.trim() !== '') {
      details.patent = true;
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
        if (!existingPaper.inventors && details.inventors) existingPaper.inventors = details.inventors;
        if (!existingPaper.patentOffice && details.patentOffice) existingPaper.patentOffice = details.patentOffice;
        if (!existingPaper.patentNumber && details.patentNumber) existingPaper.patentNumber = details.patentNumber;
        if (!existingPaper.applicationNumber && details.applicationNumber) existingPaper.applicationNumber = details.applicationNumber;
        if (!existingPaper.patent && details.patent) existingPaper.patent = details.patent; // Update patent field
        
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
    // Remove year-based filtering; scrape all papers regardless of year
    // const filteredPaperLinks = paperLinks.filter(paper => {
    //   const yearNum = parseInt(paper.year);
    //   return !isNaN(yearNum) && yearNum >= 2018;
    // });
    const filteredPaperLinks = paperLinks; // No filtering by year
    //console.log(`Filtered to ${filteredPaperLinks.length} papers published from 2018 and after`);
    let successfulScrapes = 0;
    let failedScrapes = 0;
    let authorDetails = [];
    for (const paper of filteredPaperLinks) {
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
    
    // Ensure Teacher collection has proper indexes
    await ensureTeacherIndexes();
    
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
              publicationDate: paper.publicationDate,
              inventors: paper.inventors,
              patentOffice: paper.patentOffice,
              patentNumber: paper.patentNumber,
              applicationNumber: paper.applicationNumber,
              patent: paper.patent // Include patent field in update
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
              publicationDate: paper.publicationDate || '',
              inventors: paper.inventors || '',
              patentOffice: paper.patentOffice || '',
              patentNumber: paper.patentNumber || '',
              applicationNumber: paper.applicationNumber || '',
              patent: paper.patent // Include patent field in new paper
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

    // --- SCRAPE AND STORE CITATIONS PER YEAR ---
    for (const author of authors) {
      try {
        // Get teacher name from DB (for consistency)
        let teacherDoc = await Teacher.findOne({ profileUrl: author.profileUrl });
        let teacherName = teacherDoc ? teacherDoc.name : undefined;
        if (!teacherName) {
          // fallback: try to scrape name
          const tempBrowser = await puppeteer.launch({ headless: 'new' });
          const tempPage = await tempBrowser.newPage();
          teacherName = await getTeacherName(tempPage, author.profileUrl);
          await tempBrowser.close();
        }
        if (teacherName) {
          const scholarResult = await scrapeCitationsPerYear(author.profileUrl);
          const citationsPerYear = scholarResult.citationsPerYear || {};
          const hIndex = scholarResult.hIndex || 0;
          const i10Index = scholarResult.i10Index || 0;
          
          console.log(`[CITATIONS] Scraped data for ${teacherName}:`, {
            hIndex,
            i10Index,
            citationsPerYearKeys: Object.keys(citationsPerYear).length
          });
          
          // Only save citation record if we have valid data (h-index > 0 or i10-index > 0 or citations data)
          const hasValidData = hIndex > 0 || i10Index > 0 || Object.keys(citationsPerYear).length > 0;
          
          if (hasValidData) {
            console.log(`[CITATIONS] Saving citation data for ${teacherName} - hIndex: ${hIndex}, i10Index: ${i10Index}`);
            try {
              // Use Citation model if available, otherwise use direct MongoDB operations
              if (Citation) {
                // Check if citation record already exists
                const existingCitation = await Citation.findOne({ teacherName, profileUrl: author.profileUrl });
                
                if (existingCitation) {
                  // Update existing citation record
                  await Citation.findOneAndUpdate(
                    { teacherName, profileUrl: author.profileUrl },
                    { citationsPerYear, hIndex, i10Index, lastUpdated: new Date() },
                    { new: true }
                  );
                  console.log(`[CITATIONS] Updated existing citations for ${teacherName}`);
                } else {
                  // Create new citation record
                  await Citation.findOneAndUpdate(
                    { teacherName, profileUrl: author.profileUrl },
                    { citationsPerYear, hIndex, i10Index, lastUpdated: new Date() },
                    { upsert: true, new: true }
                  );
                  console.log(`[CITATIONS] Created new citations record for ${teacherName}`);
                }
              } else {
                // Use direct MongoDB operations when Citation model is not available
                const db = mongoose.connection.db;
                const collections = await db.listCollections().toArray();
                const citationsCollectionExists = collections.some(col => col.name === 'citations');
                
                if (!citationsCollectionExists) {
                  console.log('[CITATIONS] Creating citations collection...');
                  await db.createCollection('citations');
                }
                
                const citationsCollection = db.collection('citations');
                
                // Check if citation record already exists
                const existingCitation = await citationsCollection.findOne({ teacherName, profileUrl: author.profileUrl });
                
                if (existingCitation) {
                  // Update existing citation record
                  await citationsCollection.updateOne(
                    { teacherName, profileUrl: author.profileUrl },
                    { 
                      $set: { 
                        citationsPerYear, 
                        hIndex, 
                        i10Index, 
                        lastUpdated: new Date(),
                        updatedAt: new Date()
                      }
                    }
                  );
                  console.log(`[CITATIONS] Updated existing citations for ${teacherName} (direct MongoDB)`);
                } else {
                  // Create new citation record
                  await citationsCollection.updateOne(
                    { teacherName, profileUrl: author.profileUrl },
                    { 
                      $set: { 
                        citationsPerYear, 
                        hIndex, 
                        i10Index, 
                        lastUpdated: new Date(),
                        updatedAt: new Date()
                      },
                      $setOnInsert: { createdAt: new Date() }
                    },
                    { upsert: true }
                  );
                  console.log(`[CITATIONS] Created new citations record for ${teacherName} (direct MongoDB)`);
                }
              }
            } catch (modelError) {
              console.error(`[CITATIONS] Error with Citation model: ${modelError.message}`);
              // Fallback: use direct MongoDB operations
              try {
                const db = mongoose.connection.db;
                const citationsCollection = db.collection('citations');
                
                // Check if citation record already exists
                const existingCitation = await citationsCollection.findOne({ teacherName, profileUrl: author.profileUrl });
                
                if (existingCitation) {
                  // Update existing citation record
                  await citationsCollection.updateOne(
                    { teacherName, profileUrl: author.profileUrl },
                    { 
                      $set: { 
                        citationsPerYear, 
                        hIndex, 
                        i10Index, 
                        lastUpdated: new Date(),
                        updatedAt: new Date()
                      }
                    }
                  );
                  console.log(`[CITATIONS] Updated existing citations for ${teacherName} (fallback method)`);
                } else {
                  // Create new citation record
                  await citationsCollection.updateOne(
                    { teacherName, profileUrl: author.profileUrl },
                    { 
                      $set: { 
                        citationsPerYear, 
                        hIndex, 
                        i10Index, 
                        lastUpdated: new Date(),
                        updatedAt: new Date()
                      },
                      $setOnInsert: { createdAt: new Date() }
                    },
                    { upsert: true }
                  );
                  console.log(`[CITATIONS] Created new citations record for ${teacherName} (fallback method)`);
                }
              } catch (fallbackError) {
                console.error(`[CITATIONS] Fallback method also failed: ${fallbackError.message}`);
              }
            }
          } else {
            console.log(`[CITATIONS] Skipping citation save for ${teacherName} - no valid data found`);
          }
        } else {
          console.warn(`[CITATIONS] Could not determine teacher name for profile: ${author.profileUrl}`);
        }
      } catch (citationErr) {
        console.error(`[CITATIONS] Error scraping/storing citations for ${author.profileUrl}:`, citationErr);
      }
    }
    // --- END CITATIONS ---

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