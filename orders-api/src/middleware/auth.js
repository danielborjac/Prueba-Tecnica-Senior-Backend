const SERVICE_TOKEN = process.env.SERVICE_TOKEN;

function requireServiceToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader || authHeader !== `Bearer ${SERVICE_TOKEN}`) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized'
    });
  }
  
  next();
}

module.exports = {
  requireServiceToken
};