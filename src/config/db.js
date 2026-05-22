const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`MongoDB Connecté : ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Erreur de connexion MongoDB : ${error.message}`);
    // Arrête le processus en cas d'échec critique
    process.exit(1);
  }
};

module.exports = connectDB;
