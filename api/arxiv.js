// api/arxiv.js - Place this in your Vercel project's api folder

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { 
      query = 'machine learning', 
      category = 'cs.LG',
      start = '0',
      max_results = '20',
      sortBy = 'relevance',
      sortOrder = 'descending'
    } = req.query;

    // Build ArXiv query
    const searchQuery = category === 'all' 
      ? query 
      : `${query} AND cat:${category}`;

    const arxivUrl = new URL('http://export.arxiv.org/api/query');
    arxivUrl.searchParams.append('search_query', searchQuery);
    arxivUrl.searchParams.append('start', start);
    arxivUrl.searchParams.append('max_results', max_results);
    arxivUrl.searchParams.append('sortBy', sortBy);
    arxivUrl.searchParams.append('sortOrder', sortOrder);

    // Fetch from ArXiv
    const response = await fetch(arxivUrl.toString());
    
    if (!response.ok) {
      throw new Error(`ArXiv API returned ${response.status}`);
    }

    const xmlText = await response.text();

    // Parse XML to JSON
    const papers = parseArxivXML(xmlText);

    res.status(200).json({
      success: true,
      query: searchQuery,
      start: parseInt(start),
      count: papers.length,
      papers: papers
    });

  } catch (error) {
    console.error('ArXiv API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

function parseArxivXML(xmlText) {
  const papers = [];
  
  // Simple XML parsing without external dependencies
  const entries = xmlText.match(/<entry>[\s\S]*?<\/entry>/g) || [];
  
  entries.forEach(entry => {
    const getField = (field) => {
      const match = entry.match(new RegExp(`<${field}>([\\s\\S]*?)<\/${field}>`));
      return match ? match[1].trim().replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') : '';
    };

    const getAuthors = () => {
      const authors = [];
      const authorMatches = entry.matchAll(/<name>([^<]+)<\/name>/g);
      for (const match of authorMatches) {
        authors.push(match[1].trim());
      }
      return authors;
    };

    const getCategories = () => {
      const categories = [];
      const catMatches = entry.matchAll(/<category[^>]*term="([^"]+)"/g);
      for (const match of catMatches) {
        categories.push(match[1]);
      }
      return categories;
    };

    const id = getField('id');
    const arxivId = id.split('/abs/')[1] || id.split('/').pop();

    papers.push({
      id: arxivId,
      title: getField('title').replace(/\n/g, ' ').replace(/\s+/g, ' '),
      authors: getAuthors(),
      abstract: getField('summary').replace(/\n/g, ' ').replace(/\s+/g, ' '),
      published: getField('published').split('T')[0],
      updated: getField('updated').split('T')[0],
      categories: getCategories(),
      pdfUrl: `https://arxiv.org/pdf/${arxivId}.pdf`,
      arxivUrl: `https://arxiv.org/abs/${arxivId}`,
      comment: getField('arxiv:comment')
    });
  });

  return papers;
}
