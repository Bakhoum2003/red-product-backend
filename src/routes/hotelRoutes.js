const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middlewares');
const { validate } = require('../middlewares/validateMiddlewares');
const { createHotelSchema } = require('../validations/hotelValidation');
const { getHotels, createHotel, getHotelById, updateHotel, deleteHotel } = require('../controllers/hotelControllers');

// Routes publiques (tout le monde peut voir la liste)
router.get('/', getHotels);

// Routes protégées (seul l'admin connecté peut ajouter)
router.post('/create', protect, validate(createHotelSchema), createHotel);

// Détails, mise à jour et suppression d'un hôtel
router.get('/:id', protect, getHotelById);
router.put('/:id', protect, updateHotel);
router.delete('/:id', protect, deleteHotel);

module.exports = router;
