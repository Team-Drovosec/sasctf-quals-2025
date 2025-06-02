const sequelize = require('./database');

async function initDatabase() {
    try {
        await sequelize.sync();
    } catch (error) {
        throw error;
    }
}

module.exports = initDatabase;