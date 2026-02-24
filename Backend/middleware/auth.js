const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Volunteer = require("../models/Volunteer");

const createError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const jwtSecret =
  process.env.JWT_SECRET || "your-secret-key-change-this-in-production";

// Protect routes - verify JWT token (401 on missing/invalid)
exports.protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return next(createError(401, "Not authorized to access this route"));
    }

    const decoded = jwt.verify(token, jwtSecret);

    // Route token to the correct collection based on userType in the JWT payload.
    // Volunteer tokens are issued by volunteerController with userType: "volunteer".
    let user;
    if (decoded.userType === "volunteer") {
      user = await Volunteer.findById(decoded.id).select("-password");
    } else {
      user = await User.findById(decoded.id).select("-password");
    }

    if (!user) {
      return next(createError(401, "User not found"));
    }

    if (!user.isActive) {
      return next(createError(401, "Account has been deactivated"));
    }

    req.user = user;
    next();
  } catch (err) {
    next(createError(401, "Not authorized to access this route"));
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        createError(
          403,
          `User role '${req.user.role}' is not authorized to access this route`
        )
      );
    }
    next();
  };
};

// Optional auth - doesn't block if no token
exports.optionalAuth = async (req, res, next) => {
  try {
    let token;
    
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    
    if (token) {
      try {
        const decoded = jwt.verify(token, jwtSecret);
        req.user = await User.findById(decoded.id).select("-password");
      } catch (error) {
        // Invalid token, but continue anyway
        req.user = null;
      }
    }
    
    next();
  } catch (error) {
    console.error("Optional auth error:", error);
    next();
  }
};
