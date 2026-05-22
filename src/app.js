require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Initialisation de l'application Express
const app = express();

// Connexion à MongoDB
connectDB();

// Middlewares globaux
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
} ));
app.use(express.json()); // Pour parser le JSON
app.use(express.urlencoded({ extended: true })); // Pour parser les formulaires

 
// Middleware de log des requêtes (utile pour le développement)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
   
  next();
});

// En-têtes de sécurité supplémentaires
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  next();
});

// Routes publiques (authentification)
app.use('/api/auth', require('./routes/authRoutes'));

// Routes protégées (nécessitent un token JWT)
const { protect } = require('./middlewares/auth.middlewares');

app.use('/api/users', protect, require('./routes/userRoutes'));
app.use('/api/hotels', require('./routes/hotelRoutes'));
app.use('/api/dashboard', protect, require('./routes/dashboardRoutes'));

// Point de vérification de santé (Health check)
app.get('/health', (req, res) => {
  res.json({ status: 'Le serveur fonctionne correctement' });
});

// Route de test protégée
app.get('/api/test/protected', protect, (req, res) => {
    res.json({
        success: true,
        message: "Vous êtes bien authentifié !",
        user: req.user
    });
});

// Gestion des routes non trouvées (404)
app.use((req, res, next) => {
  const error = new Error(`Route non trouvée - ${req.originalUrl}`);
  error.status = 404;
  next(error);
});

// Middleware de gestion globale des erreurs (doit être en dernier)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erreur Interne du Serveur',
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});

module.exports = app;
