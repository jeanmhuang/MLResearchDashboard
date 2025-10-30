// api/arxiv.js - Vercel API endpoint for ArXiv
// This file should be placed in the /api folder of your Vercel project

export default async function handler(req, res) {
  // Enable CORS for all origins
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    // Extract query parameters with defaults
    const { 
      query = 'machine learning', 
      category = 'cs.LG',
      start = '0',
      max_results = '20',
      sortBy = 'relevance',
      sortOrder = 'descending'
    } = req.query;

    console.log('Received params:', { query, category, start, max_results, sortBy });

    // Build ArXiv search query
    let searchQuery = query;
    if (category && category !== 'all') {
      searchQuery = `${query} AND cat:${category}`;
    }

    // Build ArXiv API URL
    const arxivParams = new URLSearchParams({
      search_query: searchQuery,
      start: start,
      max_results: max_results,
      sortBy: sortBy,
      sortOrder: sortOrder
    });

    const arxivUrl = `http://export.arxiv.org/api/query?${arxivParams}`;
    console.log('ArXiv URL:', arxivUrl);

    // Fetch from ArXiv
    const response = await fetch(arxivUrl);
    
    if (!response.ok) {
      console.error('ArXiv API error:', response.status);
      throw new Error(`ArXiv API returned ${response.status}`);
    }

    const xmlText = await response.text();
    console.log('Received XML length:', xmlText.length);

    // Parse XML to extract papers
    const papers = [];
    
    // Extract all entries using regex (more reliable than XML parsing)
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;
    
    while ((match = entryRegex.exec(xmlText)) !== null) {
      const entry = match[1];
      
      // Helper function to extract text between tags
      const extractText = (tag) => {
        const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`);
        const m = entry.match(regex);
        return m ? m[1].trim() : '';
      };
      
      // Extract ID and convert to ArXiv ID
      const id = extractText('id');
      let arxivId = '';
      if (id.includes('/abs/')) {
        arxivId = id.split('/abs/')[1];
      } else if (id.includes('arxiv.org/')) {
        arxivId = id.split('arxiv.org/')[1];
      } else {
        // Try to extract just the ID part
        const idMatch = id.match(/(\d{4}\.\d{4,5})/);
        arxivId = idMatch ? idMatch[1] : id;
      }
      
      // Extract title and clean it
      const title = extractText('title')
        .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Extract authors
      const authors = [];
      const authorRegex = /<name>([^<]+)<\/name>/g;
      let authorMatch;
      while ((authorMatch = authorRegex.exec(entry)) !== null) {
        authors.push(authorMatch[1].trim());
      }
      
      // Extract abstract/summary
      const abstract = extractText('summary')
        .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Extract dates
      const published = extractText('published').split('T')[0];
      const updated = extractText('updated').split('T')[0];
      
      // Extract categories
      const categories = [];
      const catRegex = /<category[^>]*term="([^"]+)"/g;
      let catMatch;
      while ((catMatch = catRegex.exec(entry)) !== null) {
        categories.push(catMatch[1]);
      }
      
      // Build paper object
      const paper = {
        id: arxivId,
        title: title || 'Untitled',
        authors: authors.length > 0 ? authors : ['Unknown'],
        abstract: abstract || 'No abstract available',
        published: published || updated || '',
        updated: updated || published || '',
        categories: categories,
        pdfUrl: arxivId ? `https://arxiv.org/pdf/${arxivId}.pdf` : '',
        arxivUrl: arxivId ? `https://arxiv.org/abs/${arxivId}` : ''
      };
      
      papers.push(paper);
    }

    console.log(`Parsed ${papers.length} papers`);

    // Return successful response
    res.status(200).json({
      success: true,
      query: searchQuery,
      start: parseInt(start),
      count: papers.length,
      papers: papers
    });

  } catch (error) {
    console.error('API Handler Error:', error);
    
    // Return error response
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      details: 'Failed to fetch or parse ArXiv data'
    });
  }
}