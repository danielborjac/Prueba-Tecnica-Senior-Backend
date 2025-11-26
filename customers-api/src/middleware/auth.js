const SERVICE_TOKEN = process.env.SERVICE_TOKEN;
function requireServiceToken(req,res,next){
  const h = req.headers['authorization'];
  if(!h || h !== `Bearer ${SERVICE_TOKEN}`) return res.status(401).json({error:'unauthorized'});
  next();
}
module.exports = { requireServiceToken };