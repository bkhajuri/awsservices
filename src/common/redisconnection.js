/**
 * Created by Burhani.Fakhruddin on 7/20/2017.
 */
exports.getClient = function(whichDb) {
    return getRedisClient(whichDb);
};

/**
 * Write a key/value to Redis
 *
 * @param key
 * @param value
 * @param cb
 */
exports.setValue = function (key, value, cb) {
    let client = getRedisClient(1);

    client.set(JSON.stringify(key), JSON.stringify(value), function (error, reply) {
        client.quit();
        cb(error, reply);
    });
};

/**
 * Get a value from Redis
 *
 * @param key
 * @param cb - error, value where value is the JSON object found in Redis
 */
exports.getValue = function (key, cb) {
    let client = getRedisClient(1);

    client.get(JSON.stringify(key), function (error, value) {
        client.quit();
        cb(error, JSON.parse(value));
    });
};

function getRedisClient(whichDb) {
    let redis = require("redis");
    let constants = require('./constants');

    let client = redis.createClient({
        host: constants.redisHost,
        port: constants.redisPort
    });

    client.select(whichDb, function (err, reply) {
        if (err) console.log(err);
    });

    return client;
}