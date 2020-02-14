var AWS = require('aws-sdk');
var dynamoDb = new AWS.DynamoDB.DocumentClient();
var constants = require('../common/constants');
const tableName = constants.INVENTORY_TABLE_NAME;

var firehose = new AWS.Firehose({region : constants.Region});
var count=0;
exports.handler = (event, context, callback) => {

    let params = {
        TableName: tableName
    };

    dynamoDb.scan(params, onScan);
    var count = 0;

    function onScan(err, data) {
        if (err) {
            console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            data.Items.forEach(function(itemdata) {
                console.log("Item :", ++count,JSON.stringify(itemdata));
                var paramsFirehose = {
                    Record: {
                        Data: new Buffer(JSON.stringify(itemdata))
                    },
                    DeliveryStreamName: constants.DELIVERY_STREAM_DDB2ES
                };
                firehose.putRecord(paramsFirehose, function(err, data) {
                    if (err) console.log(err, err.stack); // an error occurred
                    else     console.log(data); // successful response
                });
            });

            // continue scanning if we have more items
            if (typeof data.LastEvaluatedKey != "undefined") {
                console.log("Scanning for more...");
                params.ExclusiveStartKey = data.LastEvaluatedKey;
                dynamoDb.scan(params, onScan);
            }
        }
    }
    callback(null, 'Record Created');
};