const mongoose = require('mongoose');

function buildMongoURI() {
    const {
        MONGO_URI,
        DB_DBNAME,
    } = process.env;

    if (!MONGO_URI || !DB_DBNAME) {
        throw new Error('Missing required MongoDB environment variables: MONGO_URI, DB_DBNAME');
    }

    return `${MONGO_URI}`
}

async function connectToMongo(connectSuccessMsg, connectErrorMsg) {
    const {
        MONGO_URI,
        DB_DBNAME,
        DB_USER,
        DB_PASS,
        DB_SOURCE
    } = process.env;

    const uri = buildMongoURI();

    const options = {
        user: DB_USER,
        pass: DB_PASS,
        dbName: DB_DBNAME,
        authSource: DB_SOURCE == null ? DB_DBNAME : DB_SOURCE
    };

    try {
        await mongoose.connect(uri, options);
        console.log('[MongoDB] Connected: ', uri);
        console.log(connectSuccessMsg || '');
    } catch (err) {
        console.error('[MongoDB] Connection error: ', err);
        console.log(connectErrorMsg || '');

        throw err;
    }
}

module.exports = {
    connectToMongo
};
