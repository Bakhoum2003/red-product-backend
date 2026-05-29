const { z } = require('zod');

const createHotelSchema = z.object({
    name: z.string().min(3, "Le nom de l'hôtel doit avoir au moins 3 caractères"),
    description: z.string().optional(),
    address: z.object({
        street: z.string().optional(),
        city: z.string().min(2),
        country: z.string().min(2),
    }).optional(),
    email: z.string().email("Email invalide").optional(),
    phone: z.string().optional(),
    pricePerNight: z.number().min(0, "Le prix doit être positif"),
    currency: z.string().default("XOF"),
    stars: z.number().min(1).max(5).optional(),
    rooms: z.number().min(0).optional(),
    amenities: z.array(z.string()).optional(),
    images: z.array(z.string()).optional(),
});

module.exports = { createHotelSchema };