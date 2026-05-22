const User = require('../models/user');

const getMe = async (req, res) => {
    try {
        // L'utilisateur est déjà récupéré et vérifié par le middleware 'protect'
        const user = req.user;
        
        res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Erreur serveur",
            error: error.message
        });
    }
};

module.exports = { getMe };