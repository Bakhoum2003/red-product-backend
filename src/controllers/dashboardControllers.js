const User = require('../models/user');
const Hotel = require('../models/hotel');

/**
 * @desc    Récupérer les KPIs du dashboard
 * @route   GET /api/dashboard/kpis
 * @access  Private (Admin)
 */
const getKPIs = async (req, res) => {
    try {
        // Comptages réels depuis la base de données
        const [totalUsers, totalHotels, activeHotels] = await Promise.all([
            User.countDocuments(),
            Hotel.countDocuments(),
            Hotel.countDocuments({ isActive: true })
        ]);

        // Statistiques des nouveaux utilisateurs (dernières 24h)
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const newUsersToday = await User.countDocuments({ createdAt: { $gte: last24h } });

        // Statistiques des 30 derniers jours
        const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const [newUsersMonth, newHotelsMonth] = await Promise.all([
            User.countDocuments({ createdAt: { $gte: last30Days } }),
            Hotel.countDocuments({ createdAt: { $gte: last30Days } })
        ]);

        const kpis = {
            users: {
                total: totalUsers,
                newToday: newUsersToday,
                newThisMonth: newUsersMonth
            },
            hotels: {
                total: totalHotels,
                active: activeHotels,
                inactive: totalHotels - activeHotels,
                newThisMonth: newHotelsMonth
            },
            // Données à connecter plus tard avec de vrais modèles
            messages: {
                total: 0,
                unread: 0
            },
            emails: {
                total: 0,
                sent: 0
            },
            entities: {
                total: 0
            },
            forms: {
                total: 0
            }
        };

        res.json({
            success: true,
            data: kpis,
            generatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Erreur getKPIs:', error.message);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération des statistiques",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * @desc    Récupérer l'activité récente (derniers users et hôtels créés)
 * @route   GET /api/dashboard/recent-activity
 * @access  Private (Admin)
 */
const getRecentActivity = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

        const [recentUsers, recentHotels] = await Promise.all([
            User.find()
                .select('name email role createdAt')
                .sort({ createdAt: -1 })
                .limit(limit)
                .lean(),
            Hotel.find()
                .select('name address.city stars isActive createdAt')
                .sort({ createdAt: -1 })
                .limit(limit)
                .lean()
        ]);

        // Fusionner et trier par date de création
        const activity = [
            ...(recentUsers || []).map(u => ({
                type: 'user',
                id: u._id,
                title: u.name,
                subtitle: u.email,
                date: u.createdAt
            })),
            ...(recentHotels || []).map(h => ({
                type: 'hotel',
                id: h._id,
                title: h.name,
                subtitle: h.address?.city || 'Non renseignée',
                date: h.createdAt
            }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limit);

        res.json({
            success: true,
            data: activity,
            count: activity.length
        });
    } catch (error) {
        console.error('Erreur getRecentActivity:', error.message);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération de l'activité récente",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * @desc    Récupérer les KPIs filtrés par période
 * @route   GET /api/dashboard/kpis/period?start=2026-01-01&end=2026-05-21
 * @access  Private (Admin)
 */
const getKPIsByPeriod = async (req, res) => {
    try {
        const { start, end } = req.query;

        if (!start || !end) {
            return res.status(400).json({
                success: false,
                message: "Les paramètres 'start' et 'end' sont requis (format: YYYY-MM-DD)"
            });
        }

        const startDate = new Date(start);
        const endDate = new Date(end);
        endDate.setHours(23, 59, 59, 999); // Inclure toute la journée de fin

        // Validation des dates
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Format de date invalide. Utilisez le format YYYY-MM-DD"
            });
        }

        if (startDate > endDate) {
            return res.status(400).json({
                success: false,
                message: "La date de début doit être antérieure à la date de fin"
            });
        }

        const dateFilter = { createdAt: { $gte: startDate, $lte: endDate } };

        const [usersInPeriod, hotelsInPeriod] = await Promise.all([
            User.countDocuments(dateFilter),
            Hotel.countDocuments(dateFilter)
        ]);

        res.json({
            success: true,
            data: {
                period: {
                    start: startDate.toISOString(),
                    end: endDate.toISOString()
                },
                users: usersInPeriod,
                hotels: hotelsInPeriod
            }
        });
    } catch (error) {
        console.error('Erreur getKPIsByPeriod:', error.message);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération des statistiques par période",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = { getKPIs, getRecentActivity, getKPIsByPeriod };