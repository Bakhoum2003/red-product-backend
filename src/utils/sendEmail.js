const nodemailer = require('nodemailer');

/**
 * Envoie un email en utilisant les informations SMTP configurées dans le fichier .env
 * @param {Object} options Options de l'email (email, subject, message ou html)
 */
const sendEmail = async (options) => {
    // Création du transporteur SMTP
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    // Définition des options du message
    const mailOptions = {
        from: `RED PRODUCT <no-reply@redproduct.com>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html // Optionnel, pour envoyer du contenu au format HTML
    };

    // Envoi de l'email
    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
