export const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access only" });
  }
  next();
};

export const providerOnly = (req, res, next) => {
  if (req.user.role !== "provider") {
    return res.status(403).json({ message: "Service Provider access only" });
  }
  next();
};

export const allowRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: "Access denied" });
  }
  next();
};