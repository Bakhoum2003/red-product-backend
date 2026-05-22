const jwt = require('jsonwebtoken');
const User = require('../models/user');

const protect = async (req, res, next) => {
    try {
        let token;

        // Vérifier si le token est dans l'en-tête Authorization
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Accès non autorisé - Aucun token fourni"
            });
        }

        // Vérifier le token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Ajouter les infos de l'utilisateur à la requête
        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Utilisateur non trouvé"
            });
        }

        next();
    } catch (error) {
        console.error(error);
        return res.status(401).json({
            success: false,
            message: "Token invalide ou expiré"
        });
    }
};

module.exports = { protect };