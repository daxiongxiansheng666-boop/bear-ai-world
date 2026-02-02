// 调试端点
const { Client } = require('pg');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  try {
    const url = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.PRISMA_DATABASE_URL;
    res.json({ 
      success: true, 
      hasUrl: !!url,
      urlPreview: url ? url.substring(0, 50) + '...' : 'none',
      nodeEnv: process.env.NODE_ENV
    });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
};
