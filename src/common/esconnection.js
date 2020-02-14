/**
 * Created by Mike.Gentry on 9/21/2016.
 *
 * Sets ElasticSearch config info and creates a new client.
 *
 */
let AWS = require('aws-sdk');
let credentials = new AWS.EnvironmentCredentials('AWS');
let constants = require('./constants');

exports.getClient = function(mustSign) {

    if (mustSign) {

        return require('elasticsearch').Client({
            hosts: constants.esUrl,
            connectionClass: require('http-aws-es'),
            amazonES: {
                region: constants.Region,
                credentials: credentials
            }
        });

    } else {
        return require('elasticsearch').Client( {
            hosts: [
                constants.esUrl
            ]
        });
    }
};

exports.canQuery = function (index, typeName, query, callback) {

    let client = require('elasticsearch').Client({
        hosts: constants.esUrl,
        connectionClass: require('http-aws-es'),
        amazonES: {
            region: constants.Region,
            credentials: credentials
        }
    });

    client.search({
        index: index,
        type: typeName,
        body: query
    }, function (error, response, status) {
        if (error) callback(error);
        callback(null);
    });
};
