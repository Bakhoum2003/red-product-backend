const User = require('../models/user');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { sendVerificationEmail } = require('../services/emailService');

const getPublicBaseUrl = (req) => {
    const forwardedProto = req.headers['x-forwarded-proto'];
    const forwardedHost = req.headers['x-forwarded-host'];
    const protocol = Array.isArray(forwardedProto)
        ? forwardedProto[0]
        : forwardedProto || req.protocol || 'http';
    const host = Array.isArray(forwardedHost)
        ? forwardedHost[0]
        : forwardedHost || req.get('host');

    if (protocol && host) {
        return `${protocol}://${host}`;
    }

    return process.env.APP_URL || 'http://localhost:5000';
};

const getFrontendUrl = (req) => {
    return process.env.FRONTEND_URL || 'http://127.0.0.1:5500';
};

const redirectToFrontend = (req, res, status, message) => {
    const frontendUrl = getFrontendUrl(req);
    const params = new URLSearchParams({ verified: status, message });
    return res.redirect(`${frontendUrl}?${params.toString()}`);
};

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

        // Générer le token de vérification d'email
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpire = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 heures

        const user = await User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            isVerified: false,
            emailVerificationToken: verificationToken,
            emailVerificationExpire: verificationExpire
        });

        const baseUrl = getPublicBaseUrl(req);

        // Envoyer l'email de confirmation via Brevo
        try {
            await sendVerificationEmail(user, verificationToken, baseUrl);
        } catch (mailError) {
            // Annuler la création si l'email échoue
            await User.findByIdAndDelete(user._id);
            console.error('Erreur envoi email de vérification:', mailError);
            return res.status(500).json({
                success: false,
                message: "Erreur lors de l'envoi de l'email de confirmation. Veuillez réessayer."
            });
        }

        res.status(201).json({
            success: true,
            message: "Compte créé avec succès. Un email de confirmation a été envoyé à " + user.email + ". Veuillez vérifier votre boîte mail pour activer votre compte."
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

        res.status(500).json({
            success: false,
            message: "Erreur serveur",
            ...(process.env.NODE_ENV === 'development' && { error: error.message })
        });
    }
};

const login = async (req, res) => {
    try {
        let { email, password } = req.body;

        // Validation des champs
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Veuillez fournir un email et un mot de passe"
            });
        }

        // Normaliser l'email pour éviter les erreurs de casse/espace
        email = String(email).toLowerCase().trim();

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

        // Bloquer la connexion si l'email n'est pas vérifié
        if (!user.isVerified) {
            return res.status(403).json({
                success: false,
                message: "Veuillez confirmer votre adresse email avant de vous connecter."
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

// ====================== VERIFY EMAIL ======================
const verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;

        if (!token) {
            return redirectToFrontend(req, res, '0', 'Token manquant');
        }

        // Rechercher l'utilisateur par token non-expiré
        const user = await User.findOne({
            emailVerificationToken: token,
            emailVerificationExpire: { $gt: Date.now() }
        });

        if (!user) {
            return redirectToFrontend(req, res, '0', 'Lien invalide ou expiré');
        }

        // Confirmer le compte
        user.isVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpire = undefined;
        await user.save();

        return redirectToFrontend(req, res, '1', 'Votre email a bien été confirmé');
    } catch (error) {
        console.error('Erreur vérification email:', error);
        return redirectToFrontend(req, res, '0', 'Erreur lors de la confirmation');
    }
};

// ====================== LOGOUT ======================
const logout = async (req, res) => {
    try {
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

        const resetUrl = `${getPublicBaseUrl(req)}/reset-password/${resetToken}`;

        const message = `
            <h2>Demande de réinitialisation de mot de passe</h2>
            <p>Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe :</p>
            <a href="${resetUrl}" target="_blank">Réinitialiser mon mot de passe</a>
            <p>Ce lien expire dans 10 minutes.</p>
            <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
        `;

        try {
            // Appeler l'API REST Brevo pour envoyer l'email
            const response = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'api-key': process.env.BREVO_API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sender: { name: process.env.SENDER_NAME || 'RED PRODUCT', email: process.env.BREVO_SENDER_EMAIL },
                    to: [{ email: user.email, name: user.name }],
                    subject: '🔐 Réinitialisation de mot de passe — RED PRODUCT',
                    htmlContent: message
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Brevo API error: ${JSON.stringify(error)}`);
            }

            res.json({
                success: true,
                message: "Un email de réinitialisation a été envoyé"
            });
        } catch (mailError) {
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

        // Validation de la longueur du mot de passe
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Le mot de passe doit contenir au moins 8 caractères"
            });
        }

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

        // CORRECTION : Hasher le nouveau mot de passe avant stockage
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
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

// ====================== HELPERS PAGES HTML ======================
function buildSuccessPage(userName) {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email confirmé — RED PRODUCT</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f4f4; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #fff; border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.12); padding: 56px 48px; max-width: 480px; width: 90%; text-align: center; }
    .icon { font-size: 64px; margin-bottom: 24px; }
    .brand { font-size: 22px; font-weight: 700; color: #1a1a2e; letter-spacing: 2px; margin-bottom: 32px; }
    h1 { color: #27ae60; font-size: 26px; margin-bottom: 16px; }
    p { color: #555; font-size: 15px; line-height: 1.7; margin-bottom: 12px; }
    .btn { display: inline-block; margin-top: 28px; background: linear-gradient(135deg,#c0392b,#e74c3c); color: #fff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: 700; font-size: 15px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✅</div>
    <div class="brand">RED PRODUCT</div>
    <h1>Email confirmé !</h1>
    <p>Bonjour <strong>${userName}</strong>,</p>
    <p>Votre compte a été confirmé avec succès.</p>
    <p>Vous pouvez maintenant vous connecter et accéder à votre espace d'administration.</p>
    <a href="${process.env.FRONTEND_URL || '/'}" class="btn">Se connecter</a>
  </div>
</body>
</html>`;
}

function buildErrorPage(title, message) {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — RED PRODUCT</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f4f4; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #fff; border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.12); padding: 56px 48px; max-width: 480px; width: 90%; text-align: center; }
    .icon { font-size: 64px; margin-bottom: 24px; }
    .brand { font-size: 22px; font-weight: 700; color: #1a1a2e; letter-spacing: 2px; margin-bottom: 32px; }
    h1 { color: #c0392b; font-size: 24px; margin-bottom: 16px; }
    p { color: #555; font-size: 15px; line-height: 1.7; margin-bottom: 12px; }
    .btn { display: inline-block; margin-top: 28px; background: linear-gradient(135deg,#c0392b,#e74c3c); color: #fff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: 700; font-size: 15px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">❌</div>
    <div class="brand">RED PRODUCT</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="${process.env.FRONTEND_URL || '/'}" class="btn">Retour à l'accueil</a>
  </div>
</body>
</html>`;
}

module.exports = { register, login, logout, forgotPassword, resetPassword, verifyEmail };
