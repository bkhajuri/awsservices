let AWS = require('aws-sdk');
let constants = require('../common/constants');
let logging = require('../../nodejsutilities/Logging/logging');
let parmLookup = require('../../configurationservice/src/parameterLookup');

/**
 * Invoke a lambda with the given payload
 *
 * @param lambdaName
 * @param payload
 * @param callback - returns null if call was ok, otherwise the error message
 */
exports.canBeInvoked = function(lambdaName, payload, callback) {

    // lookup the actual lambda name in the parameter store
    parmLookup.getStringParameter(lambdaName, constants.Region, function (error, value) {

        if (error) {
            console.log('error getting lambda name for ' + lambdaName, error);
            logging.logException(error, constants.sentryUrl);
            callback(null);
        } else {

            let lambda = new AWS.Lambda();

            lambda.invoke({
                FunctionName: value,
                Payload: JSON.stringify(payload) // pass params
            }, function (error, transData) {

                if (error) {
                    console.log('error invoking ' + value, error);
                    console.log('data', transData);
                    callback(error);
                } else {
                    callback(null);
                }
            });

        }
    });

};
