/*
  Functions to test that the system is alive.
 */

/**
 * Run heartbeat tests.
 * @param event If empty or no jobs args are listed, will run all heartbeat tests.
 *        args allowed:
 *        ALL - run all
 *
 *        Example events:
 *           { jobs: ['All'] }
 *           { jobs: ['ElasticSearch', 'Redis'] }
 *
 *        Full list of jobs you can send:
 *           All
 *           ElasticSearch (includes vehicle index, saved search index, validation index)
 *           Validation
 *           Inventory
 *           SavedSearch
 *           Redis
 *           Dynamo
 *           InventoryAttributes
 *           Aliases
 *           AgWebsite
 *           ImageViewerWebsite
 *
 * @param context
 * @param callback
 */
let constants = require('../common/constants');
let ddb = require('../common/dynamodbconnection');
let redis = require('../common/redisconnection');
let httpResponse = require('../../nodejsutilities/HttpResponse/httpResponse');
let raven = require('../common/ravenUtils');
let lambda = require('../common/lambdaUtils');
let request = require('../common/requestUtils');
let es = require('../common/esconnection');
let statusOk = 'ok';

exports.main = function (event, context, callback) {
    let response = httpResponse.getHttpResponse(constants.corsOrigin);
    response.statusCode = 200;

    try {
        if (!event.hasOwnProperty('jobs')) {
            event.jobs = [constants.heartbeatAll];
        } else if (event.jobs.indexOf(constants.heartbeatAll) > -1) {
            event.jobs = [constants.heartbeatAll];
        }

        let promises = [];

        if (event.jobs.indexOf(constants.heartbeatAll) > -1) {
            promises.push(checkDynamo());
            promises.push(checkIsValidModel());
            promises.push(checkValidationIndex());
            promises.push(checkVehicleIndex());
            promises.push(checkAgWebsite());
            promises.push(checkRedis());
            promises.push(checkInvPost());
        } else {
            if (event.jobs.indexOf(constants.heartbeatDynamo) > -1) promises.push(checkDynamo());
            if (event.jobs.indexOf(constants.heartbeatValidation) > -1) promises.push(checkIsValidModel());
            if (event.jobs.indexOf(constants.heartbeatValidation) > -1) promises.push(checkValidationIndex());
            if (event.jobs.indexOf(constants.heartbeatElasticSearch) > -1) promises.push(checkVehicleIndex());
            if (event.jobs.indexOf(constants.heartbeatAgWebsite) > -1) promises.push(checkAgWebsite());
            if (event.jobs.indexOf(constants.heartbeatRedis) > -1) promises.push(checkRedis());
            if (event.jobs.indexOf(constants.heartbeatInventoryPost) > -1) promises.push(checkInvPost());
        }

        if (promises.length === 0) {
            response.body = JSON.stringify('No job to run');
            callback(null, response);
        } else {

            Promise.all(promises).then(function (resolved) {
                let errors = [];
                let healthy = [];
                let jobNames = [];

                resolved.forEach(function (r) {
                    if (r.result !== statusOk) {
                        jobNames.push(r.heartbeatCheck);
                        errors.push({failed: r.heartbeatCheck, error: r.result});
                    } else {
                        healthy.push({name: r.heartbeatCheck, status: r.result});
                    }
                });

                console.log('jobnames', jobNames);
                console.log('leng', jobNames.length);
                if (jobNames.length > 0) raven.logMessage('Services failed heartbeat check: ' + jobNames.join(',') + '.  See heartbeat log for more information.');

                if (errors.length > 0) response.statusCode = 500;
                else console.log('thump thump');

                response.body = JSON.stringify({errors: errors, healthy: healthy});
                callback(null, response);

            }, function (error) {
                console.log('error running promises', error);
                raven.logException(error);
                response.statusCode = 500;
                response.body = JSON.stringify(error);
                callback(null, response);
            });

        }
    } catch (bigError) {
        raven.logException(bigError);
        response.statusCode = 500;
        response.body = JSON.stringify(bigError);
        callback(null, response);
    }
};

function checkRedis() {
    return new Promise(function (resolve, reject) {

        let myKey = 'HeartbeatKey';
        let myValue = { value: 1 };

        redis.setValue(myKey, myValue, function (error, reply) {

            if (error) {
                console.log(constants.heartbeatRedis, error);
                reject(hbObject(constants.heartbeatRedis, error));
            }
            else {

                redis.getValue(myKey, function (error, values) {
                    console.log('all values', values);
                    if (error) {
                        console.log(constants.heartbeatRedis, error);
                        reject(hbObject(constants.heartbeatRedis, error));
                    } else {
                        if (values.value === myValue.value)
                            resolve(hbObject(constants.heartbeatRedis, statusOk));
                        else {
                            console.log(constants.heartbeatRedis, { reason: 'bad read from redis' });
                            reject(hbObject(constants.heartbeatRedis, { reason: 'bad read from redis' }));
                        }
                    }
                });

            }
        });

    }).catch(function(err){
        return err;
    });
}

function checkAgWebsite() {
    return new Promise(
        function (resolve, reject) {

            request.get(constants.corsOrigin + '/home', function (error, response, body) {
                if (error) {
                    console.log(constants.heartbeatAgWebsite, error);
                    reject(hbObject(constants.heartbeatAgWebsite, error));
                } else if (body && body.indexOf('html') > -1) {
                    resolve(hbObject(constants.heartbeatAgWebsite, statusOk));
                } else {
                    console.log(constants.heartbeatAgWebsite, response);
                    reject(hbObject(constants.heartbeatAgWebsite, { response: response }));
                }
            });
        }
    ).catch(function(err){
        //return error;
        return err;
    });
}

function checkDynamo() {
    return new Promise(
        function (resolve, reject) {
            // just ping a table and see if dynamo responds
            let parms = {
                TableName: 'adesaworld_inventory',
                Key: {id: 'xxx'}
            };

            ddb.get(parms, function (error, info) {
                if (error) {
                    console.log(constants.heartbeatDynamo, error);
                    console.log(constants.heartbeatDynamo, info);
                    reject(hbObject(constants.heartbeatDynamo, error));
                } else {
                    resolve(hbObject(constants.heartbeatDynamo, statusOk));
                }
            });
        }
    ).catch(function(err){
        //return error;
        return err;
    });
}

function checkIsValidModel() {
    return new Promise(
        function (resolve, reject) {

            let payload = {
                make: 'Ford', model: 'F-150'
            };

            lambda.canBeInvoked(constants.LAMBDA_VALIDATION_IS_VALID_MODEL, payload, function (error) {
                if (error) {
                    console.log(constants.heartbeatValidation, error);
                    reject(hbObject(constants.heartbeatValidation, error));
                } else {
                    resolve(hbObject(constants.heartbeatValidation, statusOk));
                }
            });

        }
    ).catch(function(err){
        //return error;
        return err;
    });
}

function checkValidationIndex() {
    return new Promise(
        function (resolve, reject) {

            let query = {
                size: 1
            };

            es.canQuery(constants.validationIndexName, constants.validationTypeName, query, function(error) {
                if (error) {
                    console.log(constants.heartbeatValidation, error);
                    reject(hbObject(constants.heartbeatValidation, error));
                } else {
                    resolve(hbObject(constants.heartbeatValidation, statusOk));
                }
            });

        }
    ).catch(function(err){
        //return error;
        return err;
    });
}

function checkInvPost() {
    return new Promise(
        function (resolve, reject) {

            let payload = {
                body: [],
                queryStringParameters: {
                    pulsecheck: 'true'
                },
                requestContext: {
                    authorizer: {
                        principalId: 'alsobogus'
                    }
                }
            };

            lambda.canBeInvoked(constants.LAMBDA_INVENTORY_POST, payload, function (error) {
                if (error) {
                    console.log(constants.heartbeatInventoryPost, error);
                    reject(hbObject(constants.heartbeatInventoryPost, error));
                } else {
                    resolve(hbObject(constants.heartbeatInventoryPost, statusOk));
                }
            });

        }
    );
}

function checkVehicleIndex() {
    return new Promise(
        function (resolve, reject) {

            let query = {
                size: 1
            };

            es.canQuery(constants.vehiclesearchindexname, constants.vehiclesearchtypename, query, function(error) {
                if (error) {
                    console.log(constants.heartbeatElasticSearch, error);
                    reject(hbObject(constants.heartbeatElasticSearch, error));
                } else {
                    resolve(hbObject(constants.heartbeatElasticSearch, statusOk));
                }
            });

        }
    ).catch(function(err){
        //return error;
        return err;
    });
}

function hbObject(jobName, msg) {
    return {
        heartbeatCheck: jobName, result: msg
    }
}
