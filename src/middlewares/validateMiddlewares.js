const validate = (schema) => async (req, res, next) => {
    try {
        await schema.parseAsync(req.body);
        next();
    } catch (error) {
        if (error.name !== 'ZodError') {
            return next(error);
        }

        return res.status(400).json({
            success: false,
            message: "Données invalides",
            errors: (error.errors || []).map(err => ({
                field: err.path ? err.path.join('.') : 'unknown',
                message: err.message || 'Erreur inconnue'
            }))
        });
    }
};

module.exports = { validate };