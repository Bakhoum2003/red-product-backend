const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middlewares');
const { getMe, create, update, deleteUser } = require('../controllers/user.Controllers');

// Route protégée - Récupérer les infos de l'utilisateur connecté
router.get('/me', protect, getMe);

// Routes CRUD utilisateurs
// Créer un nouvel utilisateur
router.post('/', create);

// Mettre à jour un utilisateur
router.put('/:id', protect, update);

// Supprimer un utilisateur
router.delete('/:id', protect, deleteUser);

module.exports = router;