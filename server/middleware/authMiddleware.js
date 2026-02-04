const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(403).json({ message: 'No token provided' });
    }

    try {
        // Bearer <token>
        const bearer = token.split(' ');
        const bearerToken = bearer[1];

        const decoded = jwt.verify(bearerToken, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
};

const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'ADMIN') {
        next();
    } else {
        res.status(403).json({ message: 'Require Admin Role' });
    }
};

const isFaculty = (req, res, next) => {
    if (req.user && (req.user.role === 'FACULTY' || req.user.role === 'ADMIN')) {
        next();
    } else {
        res.status(403).json({ message: 'Require Faculty Role' });
    }
};

module.exports = { verifyToken, isAdmin, isFaculty };
