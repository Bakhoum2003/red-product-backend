const mongoose = require('mongoose');

const hotelSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Le nom de l\'hôtel est requis'],
        trim: true
    },
    description: {
        type: String,
        trim: true,
        default: '' 
    },
    address: {
        street: { type: String, trim: true },
        city: { type: String, trim: true },
        country: { type: String, trim: true },
        postalCode: { type: String, trim: true }
    },
    email: {
        type: String,
        lowercase: true,
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    stars: {
        type: Number,
        min: 1,
        max: 5,
        default: 3
    },
    rooms: {
        type: Number,
        min: 0,
        default: 0
    },
    pricePerNight: {
        type: Number,
        min: 0, 
        default: 0
    },
    currency: {
        type: String,
        default: 'XOF'
    },
    amenities: [{
        type: String,
        trim: true
    }],
    images: [{
        type: String
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

// Index pour les recherches fréquentes
hotelSchema.index({ 'address.city': 1 });
hotelSchema.index({ isActive: 1 });
hotelSchema.index({ createdAt: -1 });

const Hotel = mongoose.model('Hotel', hotelSchema);
module.exports = Hotel;
