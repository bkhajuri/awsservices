let constants = require('./constants');
let Raven = require('raven');
let installed = false;

exports.logMessage = function(message) {
    if (!installed) {
        Raven.config(constants.sentryUrl).install();
        installed = true;
    }

    Raven.captureMessage(message);
};

exports.logException = function (e) {
    if (!installed) {
        Raven.config(constants.sentryUrl).install();
        installed = true;
    }

    Raven.captureException(e);
};
