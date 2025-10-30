// api/arxiv.js - Enhanced Vercel API with AI features simulation
// Place this in your Vercel project's api folder

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
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
      sortOrder = 'descending',
      enhance = 'true'  // New parameter for enhanced features
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

    // Parse XML to JSON with enhanced features
    const papers = parseArxivXML(xmlText, enhance === 'true');

    res.status(200).json({
      success: true,
      query: searchQuery,
      start: parseInt(start),
      count: papers.length,
      papers: papers,
      features: {
        aiSummaries: enhance === 'true',
        impactMetrics: enhance === 'true',
        researchLineage: enhance === 'true',
        recommendations: enhance === 'true'
      }
    });

  } catch (error) {
    console.error('ArXiv API error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

function parseArxivXML(xmlText, enhance = false) {
  const papers = [];
  
  // Simple XML parsing without external dependencies
  const entries = xmlText.match(/<entry>[\s\S]*?<\/entry>/g) || [];
  
  entries.forEach(entry => {
    const getField = (field) => {
      const match = entry.match(new RegExp(`<${field}>([\\s\\S]*?)<\/${field}>`));
      return match ? match[1].trim().replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') : '';
    };

    const getAuthors = () => {
      const authorMatches = entry.match(/<author>[\s\S]*?<\/author>/g) || [];
      return authorMatches.map(author => {
        const nameMatch = author.match(/<name>(.*?)<\/name>/);
        return nameMatch ? nameMatch[1].trim() : '';
      });
    };

    const getCategories = () => {
      const categoryMatches = entry.match(/<category[^>]*term="([^"]+)"/g) || [];
      return categoryMatches.map(cat => {
        const termMatch = cat.match(/term="([^"]+)"/);
        return termMatch ? termMatch[1] : '';
      });
    };

    const id = getField('id').split('/').pop() || '';
    const title = getField('title').replace(/\n/g, ' ').trim();
    const abstract = getField('summary').replace(/\n/g, ' ').trim();
    const published = getField('published').split('T')[0];
    const updated = getField('updated').split('T')[0];
    const authors = getAuthors();
    const categories = getCategories();
    
    const arxivUrl = `https://arxiv.org/abs/${id}`;
    const pdfUrl = `https://arxiv.org/pdf/${id}.pdf`;

    const paperData = {
      id,
      title,
      abstract,
      authors,
      categories,
      published,
      updated,
      arxivUrl,
      pdfUrl
    };

    // Add enhanced features if requested
    if (enhance) {
      paperData.enhanced = {
        // AI Summary (simulated - in production, would use GPT API)
        aiSummary: generateAISummary(title, abstract),
        
        // Impact Metrics (simulated - in production, would fetch from various APIs)
        impact: {
          citations: Math.floor(Math.random() * 1000),
          githubStars: Math.floor(Math.random() * 500),
          blogMentions: Math.floor(Math.random() * 100),
          industryAdoption: Math.floor(Math.random() * 50)
        },
        
        // Research Lineage (simulated - in production, would use citation network)
        lineage: generateLineage(title, categories),
        
        // Relevance Score (simulated - in production, would use ML model)
        relevanceScore: Math.random(),
        
        // Key Insights
        keyInsights: generateKeyInsights(title, abstract),
        
        // Related Papers (simulated)
        relatedPapers: generateRelatedPapers(id)
      };
    }

    papers.push(paperData);
  });

  return papers;
}

// Helper functions for enhanced features (simulated)
function generateAISummary(title, abstract) {
  const summaries = [
    {
      whyMatters: "This paper introduces a breakthrough approach that could revolutionize model efficiency.",
      keyContribution: "Reduces computational requirements by 40% while maintaining state-of-the-art performance.",
      practicalImpact: "Enables deployment of large models on edge devices for the first time."
    },
    {
      whyMatters: "Solves a critical bottleneck in scaling transformer models to longer sequences.",
      keyContribution: "Novel attention mechanism that scales linearly instead of quadratically.",
      practicalImpact: "Makes it feasible to process documents with millions of tokens."
    },
    {
      whyMatters: "Bridges the gap between theoretical understanding and practical implementation.",
      keyContribution: "Provides mathematical guarantees for convergence in real-world scenarios.",
      practicalImpact: "Reduces training time from weeks to days for production models."
    }
  ];
  
  return summaries[Math.floor(Math.random() * summaries.length)];
}

function generateLineage(title, categories) {
  const lineageMap = {
    'cs.LG': [
      { paper: 'BERT', year: 2018 },
      { paper: 'RoBERTa', year: 2019 },
      { paper: 'Current Work', year: 2024 }
    ],
    'cs.CV': [
      { paper: 'ResNet', year: 2015 },
      { paper: 'EfficientNet', year: 2019 },
      { paper: 'Current Work', year: 2024 }
    ],
    'cs.CL': [
      { paper: 'Transformer', year: 2017 },
      { paper: 'GPT-3', year: 2020 },
      { paper: 'Current Work', year: 2024 }
    ]
  };
  
  const category = categories[0] || 'cs.LG';
  return lineageMap[category] || lineageMap['cs.LG'];
}

function generateKeyInsights(title, abstract) {
  return [
    "🎯 Achieves new SOTA on 5 benchmark datasets",
    "⚡ 10x faster inference than previous methods",
    "🔧 Easy to implement with existing frameworks",
    "📊 Extensive ablation studies validate approach"
  ].slice(0, Math.floor(Math.random() * 3) + 2);
}

function generateRelatedPapers(paperId) {
  return [
    {
      id: `related-${paperId}-1`,
      title: "Scaling Laws for Neural Language Models",
      relevance: 0.95
    },
    {
      id: `related-${paperId}-2`,
      title: "Attention Is All You Need",
      relevance: 0.89
    },
    {
      id: `related-${paperId}-3`,
      title: "BERT: Pre-training of Deep Bidirectional Transformers",
      relevance: 0.87
    }
  ].slice(0, Math.floor(Math.random() * 2) + 1);
}