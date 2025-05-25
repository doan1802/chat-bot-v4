const jwt = require('jsonwebtoken');
require('dotenv').config();

// Middleware để xác thực token JWT
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Token verification error:`, error.message);
    res.status(401).json({ error: 'Invalid token.' });
  }
};

module.exports = { verifyToken };
