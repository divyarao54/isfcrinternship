const client = require('./client');

async function getTeacherIndices() {
  try {
    const indices = await client.cat.indices({ format: 'json' });
    return indices
      .filter(index => index.index.startsWith('papers_'))
      .map(index => index.index);
  } catch (error) {
    console.error('Error getting indices:', error.message);
    return [];
  }
}

async function searchPapers(keyword) {
  const teacherIndices = await getTeacherIndices();
  
  if (teacherIndices.length === 0) {
    console.log('❌ No teacher indices found in Elasticsearch');
    console.log('💡 Run "node syncToElastic.js" to sync papers from MongoDB to Elasticsearch');
    return;
  }

  console.log(`🔍 Searching across ${teacherIndices.length} teacher indices: ${teacherIndices.join(', ')}`);

  const result = await client.search({
    index: teacherIndices,
    query: {
      multi_match: {
        query: keyword,
        fields: ['title', 'authors', 'description', 'summary'],
        fuzziness: 'AUTO',
      },
    },
    size: 50, // Increased size to get more results before deduplication
  });

  const keywordLower = keyword.toLowerCase();

  const filtered = result.hits.hits.filter(hit => {
    const { title = '', authors = '', description = '', summary = '' } = hit._source;

    return (
      title.toLowerCase().includes(keywordLower) ||
      authors.toLowerCase().includes(keywordLower) ||
      description.toLowerCase().includes(keywordLower) ||
      summary.toLowerCase().includes(keywordLower)
    );
  });

  // Deduplicate results by composite key: title+year+authors (case-insensitive, trimmed)
  const seenKeys = new Set();
  const uniqueResults = [];

  for (const hit of filtered) {
    const paper = hit._source;
    const title = (paper.title || '').trim().toLowerCase();
    const year = (paper.year || '').toString().trim();
    const authors = (paper.authors || '').trim().toLowerCase();
    const key = `${title}|${year}|${authors}`;
    if (seenKeys.has(key)) {
      continue;
    }
    seenKeys.add(key);
    uniqueResults.push(hit);
  }

  if (uniqueResults.length === 0) {
    console.log(`❌ No papers found containing "${keyword}"`);
    return;
  }

  console.log(`🔍 Search results for "${keyword}" (${uniqueResults.length} unique papers):\n`);
  uniqueResults.forEach((hit, i) => {
    const paper = hit._source;
    console.log(`${i + 1}. ${paper.title}`);
    console.log(`   ➤ Authors: ${paper.authors}`);
    console.log(`   ➤ Year: ${paper.year}`);
    console.log(`   ➤ URL: ${paper.url}`);
    console.log(`   ➤ Teacher: ${paper.teacherName}`);
    console.log(`   ➤ Index: ${hit._index}\n`);
  });
}

// CHANGE THIS TO THE KEYWORD YOU WANT TO SEARCH
const keyword = 'deep learning';
searchPapers(keyword); 