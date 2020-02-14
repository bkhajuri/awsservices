'use strict';

const AWS = require('aws-sdk');
const credentials = new AWS.EnvironmentCredentials('AWS');
const path = require('path');
var constants = require('../common/constants');

var esURL = constants.esUrl;

/************************************
 *  DR environment
 *************************************/
var sourceDDBRegion = constants.DDRegion;
var esDomainVehicle = {
    region: process.env.AWS_REGION,
    endpoint: "https://"+esURL,
    index: 'vehicles',
    doctype: 'vehicle'
};

var esDomainSavedSearch = {
    region: process.env.AWS_REGION,
    endpoint: "https://"+esURL,
    index: 'savedsearches',
    doctype: 'savedsearch'
};

// ElasticSearch endpoint
console.log("esDomainVehicle Endpoint " + esDomainVehicle.endpoint);
const endpointVehicle = new AWS.Endpoint(esDomainVehicle.endpoint);

console.log("esDomainSavedSearch Endpoint " + esDomainSavedSearch.endpoint);
const endpointSearch = new AWS.Endpoint(esDomainSavedSearch.endpoint);

function error(err, callback) {
    var errorMessage = process.env.AWS_LAMBDA_FUNCTION_NAME + " Error: " + err;
    console.log(errorMessage);
    callback(null,errorMessage);
}

function log(message) {
    console.log(message);
}

function buildESRequest(method, path, body) {
    var req = new AWS.HttpRequest(endpointVehicle);
    req.method = method;
    req.path = path;
    req.region = esDomainVehicle.region;
    req.headers['presigned-expires'] = false;
    req.headers['host'] = endpointVehicle.host;
    req.headers['content-type'] = "application/json";
    if (body !== undefined) {
        req.body = body;
    }
    var signer = new AWS.Signers.V4(req, 'es');  // es: service code
    signer.addAuthorization(credentials, new Date());

    log("ES request: " + JSON.stringify(req));

    return req;
}

function writeToES(indexType, id, doc, callback) {
    var req;
    if(indexType=="SavedSearch")
        req = buildESRequest('POST', path.join('/', esDomainSavedSearch.index, esDomainSavedSearch.doctype, id), doc);
    else
        req = buildESRequest('POST', path.join('/', esDomainVehicle.index, esDomainVehicle.doctype, id), doc);

    var send = new AWS.HttpClient();

    send.handleRequest(req, null, function (httpResp) {

        var respBody = '';
        httpResp.on('error', function (err) {
            error("Could not write record to ES: " + doc + " - " + err, callback);
        });
        httpResp.on('data', function (chunk) {
            respBody += chunk;
        });
        httpResp.on('end', function (chunk) {
            log('Record successfully written to ES: ' + respBody);
        });
    }, function (err) {
        error("Could not write record to ES: " + doc + " - " + err, callback);
    });
}

function deleteFromES(indexType, id, callback) {
    var req;
    if(indexType=="SavedSearch")
        req = buildESRequest('DELETE', path.join('/', esDomainSavedSearch.index, esDomainSavedSearch.doctype, id),null);
    else
        req = buildESRequest('DELETE', path.join('/', esDomainVehicle.index, esDomainVehicle.doctype, id),null);

    var send = new AWS.HttpClient();
    send.handleRequest(req, null, function (httpResp) {
        var respBody = '';
        httpResp.on('error', function (err) {
            error("Could not delete record from ES: (Id=" + id + ") - " + err, callback);
        });
        httpResp.on('data', function (chunk) {
            respBody += chunk;
        });
        httpResp.on('end', function (chunk) {
            log('Record successfully deleted from  ES: (Id=' + id + ')');
        });
    }, function (err) {
        error("Could not delete record from ES: (Id=" + id + ") - " + err, callback);
    });
}

function importDDBDataToES(records, callback) {
    records.forEach(function(event){
        log('Received DynamoDB Stream event: ' + JSON.stringify(event.dynamodb));

    // We only process stream events that Add/Update items
    if (event.dynamodb.NewImage !== undefined) {
        var ddbRecord = AWS.DynamoDB.Converter.unmarshall(event.dynamodb.NewImage);
        // Is the stream event coming from a region we care about (in DR that's Prod and vice-versa)
        if (ddbRecord["aws:rep:updateregion"] === sourceDDBRegion) {

            if (event.eventSourceARN.indexOf("adesaworld_savedsearch")>-1) {
                log("Adding record to ES: " + JSON.stringify(ddbRecord));
                writeToES("SavedSearch", ddbRecord.searchname.replace(/\s/g, ''), JSON.stringify(ddbRecord.savedsearch), callback);
            }
            else {
                const eventName = ddbRecord.action.toUpperCase();

                if (eventName === 'CREATE' || eventName === 'UPDATE') {
                    log("Adding record to ES: " + JSON.stringify(ddbRecord));
                    writeToES("Inventory",ddbRecord.stockId, JSON.stringify(ddbRecord), callback);
                }
                else if (eventName === 'DELETE') {
                    log("Removing record from ES: (stockId=" + ddbRecord.stockId + ")");
                    deleteFromES("Inventory",ddbRecord.stockId, callback);
                }
                else {
                    error("Invalid DDB Stream event name: " + event.eventName + ". Expected values are: 'create', 'delete', or 'update'.", callback);
                }
            }
        }
    }
    // skip stream events that delete items
    else {
        if (event.dynamodb.OldImage !== undefined) {
            var ddbRecord = AWS.DynamoDB.Converter.unmarshall(event.dynamodb.OldImage);
            // Is the stream event coming from a region we care about (in DR that's Prod and vice-versa)
            if (ddbRecord["aws:rep:updateregion"] === sourceDDBRegion) {

                if (event.eventSourceARN.indexOf("adesaworld_savedsearch")>-1) {
                    log("Removing record from ES: (ddbRecord.searchname ==" + ddbRecord.searchname+ ")");
                    deleteFromES("SavedSearch",ddbRecord.searchname, callback);
                } else deleteFromES("Inventory",ddbRecord.stockId, callback);
            }
        }

    }
    });
    callback(null, 'Successfully processed ${records.length} record(s).');
}



exports.handler = function(event, context, callback){
    try {
        log("Running Lambda: " + process.env.AWS_LAMBDA_FUNCTION_NAME);
        log("Event: " + JSON.stringify((event)));
        log("Context: " + JSON.stringify((context)));
        log("Process.env: " + JSON.stringify((process.env)));
        if (event.Records !== undefined) {
            importDDBDataToES(event.Records, callback);
        }else {
            callback(null, "No DynamoDB Stream events received. Nothing to do.");
        }
    }
    catch(e) {
        error(e,callback);
    }
};