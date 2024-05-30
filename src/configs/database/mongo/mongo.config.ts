/**
 * @fileoverview mongo.config - Configuration for mongo database
 */

export default () => ({
    mongoUri: process.env.MONGO_URI || 'mongodb://admin:123456@157.230.44.40:27017',
    mongoDb: process.env.MONGO_DB || 'nest',
    mongoUser: process.env.MONGO_USER || '',
    mongoPass: process.env.MONGO_PASS || '',
});
