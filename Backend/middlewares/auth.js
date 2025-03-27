const auth = (req, res, next) => {
  try {
    const user = req.cookies.user || null;
    if (!user && req.path !== '/api/auth/login') {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized' });
  }
};

module.exports = auth;