// api/test.js - Simple test endpoint to verify Vercel API is working

export default function handler(req, res) {
  res.status(200).json({
    success: true,
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    method: req.method,
    query: req.query
  });
}