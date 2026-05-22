const Hotel = require('../models/hotel');

// ==================== GET ALL HOTELS ====================
const getHotels = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;

        const query = {};

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { 'address.city': { $regex: search, $options: 'i' } }
            ];
        }

        const hotels = await Hotel.find(query)
            .populate('addedBy', 'name email')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Hotel.countDocuments(query);

        res.json({
            success: true,
            count: hotels.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            data: hotels
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
};

// ==================== CREATE HOTEL ====================
const createHotel = async (req, res) => {
    try {
        const hotelData = { ...req.body, addedBy: req.user._id };

        const hotel = await Hotel.create(hotelData);

        res.status(201).json({
            success: true,
            message: "Hôtel ajouté avec succès",
            data: hotel
        });
    } catch (error) {
        console.error(error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = { getHotels, createHotel };