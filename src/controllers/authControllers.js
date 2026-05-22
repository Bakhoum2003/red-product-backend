const User = require('../models/user');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');





const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validation des champs
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Veuillez fournir tous les champs requis (nom, email, mot de passe)"
            });
        }

        // Validation du format email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Format d'email invalide"
            });
        }

        // Validation de la longueur du mot de passe
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Le mot de passe doit contenir au moins 8 caractères"
            });
        }

        // Vérifier si l'utilisateur existe
        const userExists = await User.findOne({ email: email.toLowerCase().trim() });
        if (userExists) {
            return res.status(400).json({
                success: false,
                message: "Un utilisateur avec cet email existe déjà"
            });
        }

        // Hasher le mot de passe avant stockage
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword
        });

        res.status(201).json({
            success: true,
            message: "Compte créé avec succès",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors ?? {}).map(val => val?.message ?? val);
            return res.status(400).json({
                success: false,
                message: messages[0] || "Erreur de validation"
            });
        }

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "Un utilisateur avec cet email existe déjà"
            });
        }

        // Ne pas exposer error.message en production
        res.status(500).json({
            success: false,
            message: "Erreur serveur",
            ...(process.env.NODE_ENV === 'development' && { error: error.message })
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation des champs
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Veuillez fournir un email et un mot de passe"
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Email ou mot de passe incorrect"
            });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Email ou mot de passe incorrect"
            });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.json({
            success: true,
            message: "Connexion réussie",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
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

// ====================== LOGOUT ======================
const logout = async (req, res) => {
    try {
        // Pour l'instant on fait une déconnexion simple
        // (le vrai blacklist de token viendra plus tard si besoin)

        res.json({
            success: true,
            message: "Déconnexion réussie"
        });
    } catch (error) {
        console.error("Erreur déconnexion:", error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la déconnexion",
            error: error.message
        });
    }
};

// ====================== FORGOT PASSWORD ======================
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Aucun utilisateur avec cet email"
            });
        }

        // Générer un token de réinitialisation
        const resetToken = require('crypto').randomBytes(32).toString('hex');
        
        // Stocker la version hashée du token pour la sécurité (OWASP)
        const hashedToken = require('crypto')
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
        await user.save();

        // Envoyer la version brute/non-hashée dans l'url
        const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;

        const message = `
            <h2>Demande de réinitialisation de mot de passe</h2>
            <p>Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe :</p>
            <a href="${resetUrl}" target="_blank">Réinitialiser mon mot de passe</a>
            <p>Ce lien expire dans 10 minutes.</p>
            <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
        `;

        try {
            await require('../utils/sendEmail')({
                email: user.email,
                subject: "Réinitialisation de mot de passe - RED Product",
                html: message
            });

            res.json({
                success: true,
                message: "Un email de réinitialisation a été envoyé"
            });
        } catch (mailError) {
            // Annuler le token si l'envoi de l'email échoue
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save();

            console.error("Erreur d'envoi d'email:", mailError);
            return res.status(500).json({
                success: false,
                message: "L'email n'a pas pu être envoyé",
                error: mailError.message
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
    }
};

// ====================== RESET PASSWORD ======================
const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({
                success: false,
                message: "Veuillez fournir le token et le nouveau mot de passe"
            });
        }

        // Hasher le token reçu pour le comparer avec le token hashé en BDD
        const hashedToken = require('crypto')
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Token invalide ou expiré"
            });
        }

        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        res.json({
            success: true,
            message: "Mot de passe réinitialisé avec succès"
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
    }
};

module.exports = { register, login, logout, forgotPassword, resetPassword };

