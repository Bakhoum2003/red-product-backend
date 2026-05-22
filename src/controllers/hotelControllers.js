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

// ==================== SHOW SINGLE HOTEL ====================
const getHotelById = async (req, res) => {
    try {
        const { id } = req.params;
        const hotel = await Hotel.findById(id).populate('addedBy', 'name email');
        if (!hotel) {
            return res.status(404).json({ success: false, message: 'Hôtel non trouvé' });
        }
        res.json({ success: true, data: hotel });
    } catch (error) {
        console.error(error);
        res.status(400).json({ success: false, message: 'ID invalide ou erreur serveur' });
    }
};

// ==================== UPDATE HOTEL ====================
const updateHotel = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const hotel = await Hotel.findById(id);
        if (!hotel) {
            return res.status(404).json({ success: false, message: 'Hôtel non trouvé' });
        }

        // Autoriser uniquement le créateur ou un admin à modifier
        if (hotel.addedBy && hotel.addedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: "Accès refusé" });
        }

        Object.assign(hotel, updates);
        await hotel.save();

        res.json({ success: true, message: 'Hôtel mis à jour', data: hotel });
    } catch (error) {
        console.error(error);
        res.status(400).json({ success: false, message: error.message });
    }
};

// ==================== DELETE HOTEL ====================
const deleteHotel = async (req, res) => {
    try {
        const { id } = req.params;
        const hotel = await Hotel.findById(id);
        if (!hotel) {
            return res.status(404).json({ success: false, message: 'Hôtel non trouvé' });
        }

        // Autoriser uniquement le créateur ou un admin à supprimer
        if (hotel.addedBy && hotel.addedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: "Accès refusé" });
        }

        await hotel.remove();

        res.json({ success: true, message: 'Hôtel supprimé' });
    } catch (error) {
        console.error(error);
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = { getHotels, createHotel, getHotelById, updateHotel, deleteHotel };