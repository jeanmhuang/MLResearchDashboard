// api/arxiv.js - Vercel serverless function
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { query = '', category = 'cs.LG', start = '0', maxResults = '20' } = req.query;

  try {
    // Build ArXiv query
    const searchQuery = query 
      ? `all:${query} AND cat:${category}`
      : `cat:${category}`;
    
    const arxivUrl = `http://export.arxiv.org/api/query?search_query=${encodeURIComponent(searchQuery)}&start=${start}&max_results=${maxResults}&sortBy=lastUpdatedDate&sortOrder=descending`;
    
    console.log('Fetching from ArXiv:', arxivUrl);
    
    // Fetch from ArXiv
    const response = await fetch(arxivUrl);
    
    if (!response.ok) {
      throw new Error(`ArXiv API error: ${response.status}`);
    }
    
    const xmlText = await response.text();
    
    // Parse XML and convert to JSON
    const papers = parseArxivXML(xmlText);
    
    return res.status(200).json({
      success: true,
      papers,
      query,
      category,
      total: papers.length
    });
    
  } catch (error) {
    console.error('Error fetching from ArXiv:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

function parseArxivXML(xmlText) {
  const papers = [];
  
  // Simple XML parsing without external dependencies
  const entries = xmlText.split('<entry>').slice(1);
  
  entries.forEach(entry => {
    const getField = (field) => {
      const match = entry.match(new RegExp(`<${field}[^>]*>([\\s\\S]*?)<\/${field}>`));
      return match ? match[1].trim() : '';
    };
    
    const getAuthors = () => {
      const authors = [];
      const authorMatches = entry.matchAll(/<name>([^<]+)<\/name>/g);
      for (const match of authorMatches) {
        authors.push(match[1].trim());
      }
      return authors.slice(0, 3);
    };
    
    const getCategories = () => {
      const categories = [];
      const categoryMatches = entry.matchAll(/term="([^"]+)"/g);
      for (const match of categoryMatches) {
        categories.push(match[1]);
      }
      return categories.slice(0, 3);
    };
    
    const title = getField('title').replace(/\n/g, ' ').replace(/\s+/g, ' ');
    const summary = getField('summary').replace(/\n/g, ' ').replace(/\s+/g, ' ');
    const id = getField('id');
    const published = getField('published').split('T')[0];
    const updated = getField('updated').split('T')[0];
    const authors = getAuthors();
    const categories = getCategories();
    
    // Extract PDF link
    const pdfMatch = entry.match(/href="([^"]+\.pdf)"/);
    const pdfUrl = pdfMatch ? pdfMatch[1] : null;
    
    papers.push({
      title,
      abstract: summary.substring(0, 300) + (summary.length > 300 ? '...' : ''),
      authors: authors.join(', ') + (authors.length >= 3 ? ' et al.' : ''),
      published,
      updated,
      arxivId: id.split('/abs/')[1] || id,
      url: id.replace('http://', 'https://'),
      pdfUrl: pdfUrl ? pdfUrl.replace('http://', 'https://') : null,
      categories
    });
  });
  
  return papers;
}