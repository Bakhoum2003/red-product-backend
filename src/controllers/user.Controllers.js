const User = require('../models/user');
const { registerSchema } = require('../validations/authValidation');
const { z } = require('zod');

const getMe = async (req, res) => {
    try {
        // L'utilisateur est déjà récupéré et vérifié par le middleware 'protect'
        const user = req.user;
        
        res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Erreur serveur",
            error: error.message
        });
    }
};

const create = async (req, res) => {
    try {
        // Valider les données avec le schema registerSchema
        const validatedData = registerSchema.parse(req.body);

        // Vérifier si l'utilisateur existe déjà
        const existingUser = await User.findOne({ email: validatedData.email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Un utilisateur avec cet email existe déjà"
            });
        }

        // Créer un nouvel utilisateur
        const newUser = await User.create({
            name: validatedData.name,
            email: validatedData.email,
            password: validatedData.password,
            role: req.body.role || 'admin'
        });

        res.status(201).json({
            success: true,
            message: "Utilisateur créé avec succès",
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                createdAt: newUser.createdAt
            }
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: "Erreur de validation",
                errors: error.errors
            });
        }
        res.status(500).json({
            success: false,
            message: "Erreur serveur",
            error: error.message
        });
    }
};

const update = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Vérifier si l'utilisateur existe
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Utilisateur non trouvé"
            });
        }

        // Valider les données d'update (nom et email seulement)
        const updateSchema = z.object({
            name: z.string().min(3, 'Le nom doit contenir au moins 3 caractères').optional(),
            email: z.string().email('Email invalide').optional(),
            password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères').optional()
        });

        const validatedData = updateSchema.parse(updateData);

        // Vérifier si le nouvel email est unique
        if (validatedData.email && validatedData.email !== user.email) {
            const existingUser = await User.findOne({ email: validatedData.email });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: "Cet email est déjà utilisé"
                });
            }
        }

        // Mettre à jour l'utilisateur
        const updatedUser = await User.findByIdAndUpdate(
            id,
            { $set: validatedData },
            { new: true, runValidators: true }
        );

        res.json({
            success: true,
            message: "Utilisateur mis à jour avec succès",
            user: {
                id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                createdAt: updatedUser.createdAt
            }
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: "Erreur de validation",
                errors: error.errors
            });
        }
        res.status(500).json({
            success: false,
            message: "Erreur serveur",
            error: error.message
        });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Vérifier si l'utilisateur existe
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Utilisateur non trouvé"
            });
        }

        // Supprimer l'utilisateur
        await User.findByIdAndDelete(id);

        res.json({
            success: true,
            message: "Utilisateur supprimé avec succès"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Erreur serveur",
            error: error.message
        });
    }
};

module.exports = { getMe, create, update, deleteUser };