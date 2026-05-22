const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middlewares');
const { validate } = require('../middlewares/validateMiddlewares');
const { createHotelSchema } = require('../validations/hotelValidation');
const { getHotels, createHotel } = require('../controllers/hotelControllers');

// Routes publiques (tout le monde peut voir la liste)
router.get('/hotels', getHotels);

// Routes protégées (seul l'admin connecté peut ajouter)
router.post('/hotels', protect, validate(createHotelSchema), createHotel);

module.exports = router;
