let request = require('request');

/**
 * Send a request
 *
 * @param url
 * @param callback - returns error, httpResponse, body
 */
exports.get = function(url, callback) {

    request.get(url, function (error, resp, body) {
        callback(error, resp, body);
    }).on('error', function (error) {
        callback(error, null, null);
    });

};

/**
 * Post a request.
 *
 * @param url
 * @param payload - JSON format
 * @param callback - returns error, httpResonse, and body
 */
exports.post = function(url, payload, callback) {

    let options = {
        url: url,
        body: JSON.stringify(payload),
        headers: {
            'Content-type': 'application/json'
        }
    };

    request.post(options, function (err, httpResponse, body) {
        callback(err, httpResponse, body);
    });

};

/**
 * Post a request.
 *
 * @param options - full option set, including URL, payload, and any headers.
 * @param callback - returns error, httpResonse, and body
 */
exports.postWithOptions = function(options, callback) {

    request.post(options, function (err, httpResponse, body) {
        callback(err, httpResponse, body);
    });

};
