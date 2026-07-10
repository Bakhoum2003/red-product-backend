// Logo SVG RED PRODUCT (inline)
const LOGO_SVG = `
<svg style="vertical-align:sub;" width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M2.66602 2.66624H29.3286V29.3288L2.66602 2.66624Z" fill="#C0392B"/>
  <path d="M2.66602 2.66624H22.663L15.9973 15.9975L2.66602 2.66624Z" fill="rgba(0,0,0,0.15)"/>
  <path d="M2.66602 2.66624H15.9973L2.66602 29.3288V2.66624Z" fill="#C0392B"/>
</svg>
`;

const { BrevoClient, BrevoError } = require('@getbrevo/brevo');

const trimTrailingSlash = (value) => String(value || '').trim().replace(/\/+$/, '');

const getSenderEmail = () => process.env.EMAIL_FROM || process.env.BREVO_SENDER_EMAIL;

const assertBrevoConfig = () => {
    const missing = [];
    if (!process.env.BREVO_API_KEY) missing.push('BREVO_API_KEY');
    if (!getSenderEmail()) missing.push('EMAIL_FROM or BREVO_SENDER_EMAIL');
    if (missing.length > 0) {
        throw new Error(`Configuration Brevo incomplete. Variable(s) manquante(s): ${missing.join(', ')}`);
    }
};

const getBrevoClient = () => {
    assertBrevoConfig();

    return new BrevoClient({
        apiKey: process.env.BREVO_API_KEY,
        timeoutInSeconds: Number(process.env.BREVO_TIMEOUT || 30)
    });
};

const sendBrevoEmail = async ({ to, subject, htmlContent }) => {
    const brevo = getBrevoClient();
    try {
        const response = await brevo.transactionalEmails.sendTransacEmail({
            sender: {
                name: process.env.SENDER_NAME || 'RED PRODUCT',
                email: getSenderEmail()
            },
            to,
            subject,
            htmlContent
        });

        console.log('[Email] Brevo success:', {
            status: response?.statusCode || 'unknown',
            messageId: response?.messageId || 'unknown'
        });

        return response;
    } catch (error) {
        if (error instanceof BrevoError) {
            console.error('[Email] Brevo SDK error:', {
                statusCode: error.statusCode,
                body: error.body,
                message: error.message
            });
            throw new Error(`Brevo SDK error ${error.statusCode}: ${JSON.stringify(error.body || error.message)}`);
        }

        console.error('[Email] erreur inattendue:', error);
        throw error;
    }
};

/**
 * Envoie un email de verification d'adresse email a l'utilisateur.
 * @param {Object} user L'objet utilisateur (name, email)
 * @param {string} token Le token de verification brut
 * @param {string} backendUrl URL publique du backend utilisee pour construire le lien
 */
const sendVerificationEmail = async (user, token, backendUrl) => {
    const publicBackendUrl = trimTrailingSlash(backendUrl);

    if (!publicBackendUrl) {
        throw new Error('BACKEND_URL est manquant: impossible de construire le lien de confirmation.');
    }

    const verifyUrl = `${publicBackendUrl}/api/auth/verify/${token}`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmer votre email - RED PRODUCT</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background-color:#f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);max-width:600px;">
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:32px 40px;text-align:center;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:16px;">
                    ${LOGO_SVG}
                    <span style="color:#ffffff;font-size:24px;font-weight:700;letter-spacing:2px;margin-left:10px;vertical-align:middle;">RED PRODUCT</span>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <span style="color:rgba(255,255,255,0.65);font-size:13px;letter-spacing:1px;text-transform:uppercase;">Plateforme de gestion hoteliere</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:48px 48px 32px;">
              <h1 style="color:#1a1a2e;font-size:26px;font-weight:700;margin:0 0 12px;line-height:1.3;">Bienvenue, ${user.name}</h1>
              <p style="color:#555;font-size:15px;line-height:1.7;margin:0 0 24px;">
                Merci pour votre inscription sur <strong>RED PRODUCT</strong>. Pour activer votre compte et commencer a gerer vos hotels, veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous.
              </p>

              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding:8px 0 32px;">
                    <a href="${verifyUrl}"
                       style="display:inline-block;background:linear-gradient(135deg,#c0392b,#e74c3c);color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 48px;border-radius:8px;letter-spacing:0.5px;box-shadow:0 4px 15px rgba(192,57,43,0.4);">
                      Confirmer mon adresse email
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color:#888;font-size:13px;line-height:1.6;margin:0 0 8px;">
                Ce lien est valable pendant <strong>24 heures</strong>. Apres ce delai, il ne sera plus utilisable.
              </p>
              <p style="color:#888;font-size:13px;line-height:1.6;margin:0;">
                Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :
              </p>
              <p style="margin:8px 0 0;">
                <a href="${verifyUrl}" style="color:#c0392b;font-size:12px;word-break:break-all;">${verifyUrl}</a>
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 48px;">
              <hr style="border:none;border-top:1px solid #eee;margin:0;">
            </td>
          </tr>

          <tr>
            <td style="padding:24px 48px 40px;text-align:center;">
              <p style="color:#aaa;font-size:12px;margin:0 0 6px;">
                Si vous n'avez pas cree de compte sur RED PRODUCT, vous pouvez ignorer cet email.
              </p>
              <p style="color:#ccc;font-size:11px;margin:0;">
                ${new Date().getFullYear()} RED PRODUCT - Tous droits reserves
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    console.log('[Email] Verification URL:', verifyUrl);

    return sendBrevoEmail({
        to: [{ email: user.email, name: user.name }],
        subject: 'Confirmez votre adresse email - RED PRODUCT',
        htmlContent
    });
};

const sendPasswordResetEmail = async (user, resetUrl) => {
    const htmlContent = `
        <h2>Demande de reinitialisation de mot de passe</h2>
        <p>Cliquez sur le lien ci-dessous pour reinitialiser votre mot de passe :</p>
        <a href="${resetUrl}" target="_blank">Reinitialiser mon mot de passe</a>
        <p>Ce lien expire dans 10 minutes.</p>
        <p>Si vous n'avez pas demande cette reinitialisation, ignorez cet email.</p>
    `;

    console.log('[Email] Reset URL:', resetUrl);

    return sendBrevoEmail({
        to: [{ email: user.email, name: user.name }],
        subject: 'Reinitialisation de mot de passe - RED PRODUCT',
        htmlContent
    });
};

module.exports = {
    sendVerificationEmail,
    sendPasswordResetEmail
};
