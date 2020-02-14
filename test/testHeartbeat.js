let assert = require('assert');
let constants = require('../src/common/constants');
let ddb = require('../src/common/dynamodbconnection');
let raven = require('../src/common/ravenUtils');
let lambda = require('../src/common/lambdaUtils');
let redis = require('../src/common/redisconnection');
let request = require('../src/common/requestUtils');
let es = require('../src/common/esconnection');
let sinon = require('sinon');
let hb = require('../src/service/heartbeat');

describe('Heartbeat tests', function () {

    let stubDdbGet;
    let stubRavenMessage;
    let stubRavenException;
    let stubLambda;
    let stubEs;
    let stubRequestGet;
    let stubRedisGet;
    let stubRedisWrite;

    before(function() {
        stubDdbGet = sinon.stub(ddb, 'get');
        stubRavenMessage = sinon.stub(raven, 'logMessage');
        stubRavenException = sinon.stub(raven, 'logException');
        stubLambda = sinon.stub(lambda, 'canBeInvoked');
        stubEs = sinon.stub(es, 'canQuery');
        stubRequestGet = sinon.stub(request, 'get');
        stubRedisGet = sinon.stub(redis, 'getValue');
        stubRedisWrite = sinon.stub(redis, 'setValue');
    });

    after(function () {
        stubDdbGet.restore();
        stubRavenMessage.restore();
        stubRavenException.restore();
        stubLambda.restore();
        stubEs.restore();
        stubRequestGet.restore();
        stubRedisGet.restore();
        stubRedisWrite.restore();
    });

    it('dynamo - alive', function (done) {

        let event = {
            jobs: [constants.heartbeatDynamo]
        };

        let calledGet = false;
        let calledRaven = false;
        let calledLambda = false;
        let calledEs = false;

        stubRedisWrite.callsFake(function fakeFn(key, value, cb) {
            assert.fail('called Redis unnecessarily');
        });

        stubRedisGet.callsFake(function fakeFn(key, cb) {
            assert.fail('called Redis unnecessarily');
        });

        stubEs.callsFake(function fakeFn(index, typeName, query, cb) {
            calledEs = true;
            cb(null);
        });

        stubLambda.callsFake(function fakeFn(name, payload, cb) {
            calledLambda = true;
            cb(null);
        });

        stubRavenMessage.callsFake(function fakeFn(msg) {
            calledRaven = true;
        });

        stubDdbGet.callsFake(function fakeFn(parms, cb) {
            calledGet = true;
            cb(null, { Item: { username: 'xxx' } });
        });

        hb.main(event, {}, function (error, response) {

            assert.equal(true, calledGet, 'did not call dynamo');
            assert.equal(false, calledRaven, 'called raven unnecessarily');
            assert.equal(false, calledLambda, 'called lambda unnecessarily');
            assert.equal(false, calledEs, 'called elasticsearch unnecessarily');
            assert.equal(200, response.statusCode, 'wrong status code');

            done();
        });

    });

    it('dynamo - dead', function (done) {

        let event = {
            jobs: [constants.heartbeatDynamo]
        };

        let calledGet = false;
        let calledRaven = false;
        let calledLambda = false;
        let calledEs = false;

        stubRedisWrite.callsFake(function fakeFn(key, value, cb) {
            assert.fail('called Redis unnecessarily');
        });

        stubRedisGet.callsFake(function fakeFn(key, cb) {
            assert.fail('called Redis unnecessarily');
        });

        stubEs.callsFake(function fakeFn(index, typeName, query, cb) {
            calledEs = true;
            cb(null);
        });

        stubLambda.callsFake(function fakeFn(name, payload, cb) {
            calledLambda = true;
            cb(null);
        });

        stubRavenMessage.callsFake(function fakeFn(msg) {
            calledRaven = true;
            assert.equal(true, msg.indexOf(constants.heartbeatDynamo) > -1, 'called raven with wrong message');
        });

        stubDdbGet.callsFake(function fakeFn(parms, cb) {
            calledGet = true;
            cb('broken', null);
        });

        hb.main(event, {}, function (error, response) {

            assert.equal(true, calledGet, 'did not call dynamo');
            assert.equal(true, calledRaven, 'did not call raven');
            assert.equal(false, calledLambda, 'called lambda unnecessarily');
            assert.equal(false, calledEs, 'called elasticsearch unnecessarily');
            assert.equal(500, response.statusCode, 'wrong status code');
            assert.equal(1, JSON.parse(response.body).errors.length, 'did not return one error');

            done();
        });

    });

    it('lambda - alive', function (done) {

        let event = {
            jobs: [constants.heartbeatValidation]
        };

        let calledGet = false;
        let calledRaven = false;
        let calledLambda = false;
        let calledEs = false;

        stubRedisWrite.callsFake(function fakeFn(key, value, cb) {
            assert.fail('called Redis unnecessarily');
        });

        stubRedisGet.callsFake(function fakeFn(key, cb) {
            assert.fail('called Redis unnecessarily');
        });

        stubEs.callsFake(function fakeFn(index, typeName, query, cb) {
            calledEs = true;
            cb(null);
        });

        stubLambda.callsFake(function fakeFn(name, payload, cb) {
            calledLambda = true;
            cb(null);
        });

        stubRavenMessage.callsFake(function fakeFn(msg) {
            calledRaven = true;
        });

        stubDdbGet.callsFake(function fakeFn(parms, cb) {
            calledGet = true;
            cb(null, { Item: { username: 'xxx' } });
        });

        hb.main(event, {}, function (error, response) {

            assert.equal(false, calledGet, 'did dynamo unnecessarily');
            assert.equal(false, calledRaven, 'called raven unnecessarily');
            assert.equal(true, calledLambda, 'did not call lambda');
            assert.equal(true, calledEs, 'did not call elasticsearch');
            assert.equal(JSON.stringify('No job to run') === response.body, false, 'did not run any jobs');
            assert.equal(200, response.statusCode, 'wrong status code');

            done();
        });

    });

    it('lambda - dead', function (done) {

        let event = {
            jobs: [constants.heartbeatValidation]
        };

        let calledGet = false;
        let calledRaven = false;
        let calledLambda = false;
        let calledEs = false;

        stubRedisWrite.callsFake(function fakeFn(key, value, cb) {
            assert.fail('called Redis unnecessarily');
        });

        stubRedisGet.callsFake(function fakeFn(key, cb) {
            assert.fail('called Redis unnecessarily');
        });

        stubEs.callsFake(function fakeFn(index, typeName, query, cb) {
            calledEs = true;
            cb(null);
        });

        stubLambda.callsFake(function fakeFn(name, payload, cb) {
            calledLambda = true;
            cb('broken');
        });

        stubRavenMessage.callsFake(function fakeFn(msg) {
            assert.equal(true, msg.indexOf(constants.heartbeatValidation) > -1, 'called raven with wrong message');
            calledRaven = true;
        });

        stubDdbGet.callsFake(function fakeFn(parms, cb) {
            calledGet = true;
            cb(null, { Item: { username: 'xxx' } });
        });

        hb.main(event, {}, function (error, response) {

            assert.equal(false, calledGet, 'did dynamo unnecessarily');
            assert.equal(true, calledRaven, 'raven not called');
            assert.equal(true, calledLambda, 'did not call lambda');
            assert.equal(true, calledEs, 'did not call elasticsearch');
            assert.equal(500, response.statusCode, 'wrong status code');
            assert.equal(1, JSON.parse(response.body).errors.length, 'did not return one error');

            done();
        });

    });

    it('es validation - alive', function (done) {

        let event = {
            jobs: [constants.heartbeatElasticSearch]
        };

        let calledGet = false;
        let calledRaven = false;
        let calledLambda = false;
        let calledEs = false;

        stubRedisWrite.callsFake(function fakeFn(key, value, cb) {
            assert.fail('called Redis unnecessarily');
        });

        stubRedisGet.callsFake(function fakeFn(key, cb) {
            assert.fail('called Redis unnecessarily');
        });

        stubEs.callsFake(function fakeFn(index, typeName, query, cb) {
            calledEs = true;
            cb(null);
        });

        stubLambda.callsFake(function fakeFn(name, payload, cb) {
            calledLambda = true;
            cb(null);
        });

        stubRavenMessage.callsFake(function fakeFn(msg) {
            calledRaven = true;
        });

        stubDdbGet.callsFake(function fakeFn(parms, cb) {
            calledGet = true;
            cb(null, { Item: { username: 'xxx' } });
        });

        hb.main(event, {}, function (error, response) {

            assert.equal(false, calledGet, 'cakked dynamo unnecessarily');
            assert.equal(false, calledRaven, 'called raven unnecessarily');
            assert.equal(false, calledLambda, 'called lambda unnecessarily');
            assert.equal(true, calledEs, 'did not call elasticsearch');
            assert.equal(JSON.stringify('No job to run') === response.body, false, 'did not run any jobs');
            assert.equal(200, response.statusCode, 'wrong status code');

            done();
        });

    });

    it('es validation - dead', function (done) {

        let event = {
            jobs: [constants.heartbeatElasticSearch]
        };

        let calledGet = false;
        let calledRaven = false;
        let calledLambda = false;
        let calledEs = false;

        stubRedisWrite.callsFake(function fakeFn(key, value, cb) {
            assert.fail('called Redis unnecessarily');
        });

        stubRedisGet.callsFake(function fakeFn(key, cb) {
            assert.fail('called Redis unnecessarily');
        });

        stubEs.callsFake(function fakeFn(index, typeName, query, cb) {
            calledEs = true;
            cb('es broken');
        });

        stubLambda.callsFake(function fakeFn(name, payload, cb) {
            calledLambda = true;
            cb(null);
        });

        stubRavenMessage.callsFake(function fakeFn(msg) {
            assert.equal(true, msg.indexOf(constants.heartbeatElasticSearch) > -1, 'called raven with wrong message');
            calledRaven = true;
        });

        stubDdbGet.callsFake(function fakeFn(parms, cb) {
            calledGet = true;
            cb(null, { Item: { username: 'xxx' } });
        });

        hb.main(event, {}, function (error, response) {

            assert.equal(false, calledGet, 'did dynamo unnecessarily');
            assert.equal(true, calledRaven, 'raven not called');
            assert.equal(false, calledLambda, 'called lambda unnecessarily');
            assert.equal(true, calledEs, 'did not call elasticsearch');
            assert.equal(500, response.statusCode, 'wrong status code');
            assert.equal(1, JSON.parse(response.body).errors.length, 'did not return one error');
            assert.equal('es broken', JSON.parse(response.body).errors[0].error, 'did not return error message');

            done();
        });

    });

    it('ag website - alive', function (done) {

        let event = {
            jobs: [constants.heartbeatAgWebsite]
        };

        let calledGet = false;
        let calledRaven = false;
        let calledLambda = false;
        let calledEs = false;
        let calledAgWebsite = false;

        stubRedisWrite.callsFake(function fakeFn(key, value, cb) {
            assert.fail('called Redis unnecessarily');
        });

        stubRedisGet.callsFake(function fakeFn(key, cb) {
            assert.fail('called Redis unnecessarily');
        });

        stubRequestGet.callsFake(function fakeFn(url, cb) {
            calledAgWebsite = true;
            cb(null, null, '<html></html>');
        });

        stubEs.callsFake(function fakeFn(index, typeName, query, cb) {
            calledEs = true;
            cb(null);
        });

        stubLambda.callsFake(function fakeFn(name, payload, cb) {
            calledLambda = true;
            cb(null);
        });

        stubRavenMessage.callsFake(function fakeFn(msg) {
            calledRaven = true;
        });

        stubDdbGet.callsFake(function fakeFn(parms, cb) {
            calledGet = true;
            cb(null, { Item: { username: 'xxx' } });
        });

        hb.main(event, {}, function (error, response) {

            assert.equal(false, calledGet, 'cakked dynamo unnecessarily');
            assert.equal(false, calledRaven, 'called raven unnecessarily');
            assert.equal(false, calledLambda, 'called lambda unnecessarily');
            assert.equal(false, calledEs, 'called elasticsearch unnecessarily');
            assert.equal(true, calledAgWebsite, 'did not call the ag website');
            assert.equal(JSON.stringify('No job to run') === response.body, false, 'did not run any jobs');
            assert.equal(200, response.statusCode, 'wrong status code');

            done();
        });

    });

    it('ag website - dead', function (done) {

        let event = {
            jobs: [constants.heartbeatAgWebsite]
        };

        let calledGet = false;
        let calledRaven = false;
        let calledLambda = false;
        let calledEs = false;
        let calledAgWebsite = false;

        stubRedisWrite.callsFake(function fakeFn(key, value, cb) {
            assert.fail('called Redis unnecessarily');
        });

        stubRedisGet.callsFake(function fakeFn(key, cb) {
            assert.fail('called Redis unnecessarily');
        });

        stubRequestGet.callsFake(function fakeFn(url, cb) {
            calledAgWebsite = true;
            cb('ag down', null, null);
        });

        stubEs.callsFake(function fakeFn(index, typeName, query, cb) {
            calledEs = true;
            cb(null);
        });

        stubLambda.callsFake(function fakeFn(name, payload, cb) {
            calledLambda = true;
            cb(null);
        });

        stubRavenMessage.callsFake(function fakeFn(msg) {
            assert.equal(true, msg.indexOf(constants.heartbeatAgWebsite) > -1, 'called raven with wrong message');
            calledRaven = true;
        });

        stubDdbGet.callsFake(function fakeFn(parms, cb) {
            calledGet = true;
            cb(null, { Item: { username: 'xxx' } });
        });

        hb.main(event, {}, function (error, response) {

            assert.equal(false, calledGet, 'called dynamo unnecessarily');
            assert.equal(true, calledRaven, 'did not call raven');
            assert.equal(false, calledLambda, 'called lambda unnecessarily');
            assert.equal(false, calledEs, 'called elasticsearch unnecessarily');
            assert.equal(true, calledAgWebsite, 'did not call the ag website');
            assert.equal(JSON.stringify('No job to run') === response.body, false, 'did not run any jobs');
            assert.equal(500, response.statusCode, 'wrong status code');

            done();
        });

    });

    it('ag website - death from causes unknown', function (done) {

        let event = {
            jobs: [constants.heartbeatAgWebsite]
        };

        let calledGet = false;
        let calledRaven = false;
        let calledLambda = false;
        let calledEs = false;
        let calledAgWebsite = false;

        stubRedisWrite.callsFake(function fakeFn(key, value, cb) {
            assert.fail('called Redis unnecessarily');
        });

        stubRedisGet.callsFake(function fakeFn(key, cb) {
            assert.fail('called Redis unnecessarily');
        });

        stubRequestGet.callsFake(function fakeFn(url, cb) {
            calledAgWebsite = true;
            cb(null, 'wth', null);
        });

        stubEs.callsFake(function fakeFn(index, typeName, query, cb) {
            calledEs = true;
            cb(null);
        });

        stubLambda.callsFake(function fakeFn(name, payload, cb) {
            calledLambda = true;
            cb(null);
        });

        stubRavenMessage.callsFake(function fakeFn(msg) {
            assert.equal(true, msg.indexOf(constants.heartbeatAgWebsite) > -1, 'called raven with wrong message');
            calledRaven = true;
        });

        stubDdbGet.callsFake(function fakeFn(parms, cb) {
            calledGet = true;
            cb(null, { Item: { username: 'xxx' } });
        });

        hb.main(event, {}, function (error, response) {

            assert.equal(false, calledGet, 'called dynamo unnecessarily');
            assert.equal(true, calledRaven, 'did not call raven');
            assert.equal(false, calledLambda, 'called lambda unnecessarily');
            assert.equal(false, calledEs, 'called elasticsearch unnecessarily');
            assert.equal(true, calledAgWebsite, 'did not call the ag website');
            assert.equal(JSON.stringify('No job to run') === response.body, false, 'did not run any jobs');
            assert.equal(500, response.statusCode, 'wrong status code');

            done();
        });

    });

    it('catch big error when asked for all jobs', function (done) {

        let event = {
            jobs: [constants.heartbeatAll]
        };

        let calledGet = false;
        let calledRaven = false;
        let calledLambda = false;
        let calledEs = false;
        let calledAgWebsite = false;

        stubRedisWrite.callsFake(function fakeFn(key, value, cb) {
            cb(null, null);
        });

        stubRedisGet.callsFake(function fakeFn(key, cb) {
            cb(null, null);
        });

        stubRequestGet.callsFake(function fakeFn(url, cb) {
            calledAgWebsite = true;
            cb('ag down', null, null);
        });

        stubEs.callsFake(function fakeFn(index, typeName, query, cb) {
            calledEs = true;
            cb('es down');
        });

        stubLambda.callsFake(function fakeFn(name, payload, cb) {
            calledLambda = true;
            cb('lambda down');
        });

        stubRavenMessage.callsFake(function fakeFn(msg) {
            calledRaven = true;
        });

        stubRavenException.callsFake(function fakeFn(e) {
            calledRaven = true;
            console.log('logged an exception', e);
        });

        stubDdbGet.callsFake(function fakeFn(parms, cb) {
            calledGet = true;
            cb(null, { Item: { username: 'xxx' } });
        });

        hb.main(event, {}, function (error, response) {

            assert.equal(true, calledGet, 'did not call dynamo');
            assert.equal(true, calledRaven, 'did not call raven');
            assert.equal(true, calledLambda, 'did not call lambda');
            assert.equal(true, calledEs, 'did not call elasticsearch');
            assert.equal(true, calledAgWebsite, 'did not call the ag website');
            assert.equal(JSON.stringify('No job to run') === response.body, false, 'did not run any jobs');
            assert.equal(500, response.statusCode, 'wrong status code');

            done();
        });

    });

    it('catch big error when not given any jobs', function (done) {

        let event = {};

        let calledGet = false;
        let calledRaven = false;
        let calledLambda = false;
        let calledEs = false;
        let calledAgWebsite = false;

        stubRequestGet.callsFake(function fakeFn(url, cb) {
            calledAgWebsite = true;
            cb('ag down', null, null);
        });

        stubEs.callsFake(function fakeFn(index, typeName, query, cb) {
            calledEs = true;
            cb('es down');
        });

        stubLambda.callsFake(function fakeFn(name, payload, cb) {
            calledLambda = true;
            cb('lambda down');
        });

        stubRavenMessage.callsFake(function fakeFn(msg) {
            calledRaven = true;
        });

        stubRavenException.callsFake(function fakeFn(e) {
            console.log('logged an exception', e);
            calledRaven = true;
        });

        stubDdbGet.callsFake(function fakeFn(parms, cb) {
            calledGet = true;
            cb(null, { Item: { username: 'xxx' } });
        });

        hb.main(event, {}, function (error, response) {

            assert.equal(true, calledGet, 'did not call dynamo');
            assert.equal(true, calledRaven, 'did not call raven');
            assert.equal(true, calledLambda, 'did not call lambda');
            assert.equal(true, calledEs, 'did not call elasticsearch');
            assert.equal(true, calledAgWebsite, 'did not call the ag website');
            assert.equal(JSON.stringify('No job to run') === response.body, false, 'did not run any jobs');
            assert.equal(500, response.statusCode, 'wrong status code');

            done();
        });

    });

    it('bogus job sent', function (done) {

        let event = {
            jobs: ['paid protester']
        };

        hb.main(event, {}, function (error, response) {
            assert.equal(response.statusCode, 200, 'wrong status code');
            assert.equal(response.body, JSON.stringify('No job to run'), 'wrong message');
            done();
        });
    });

    it('redis - alive', function (done) {

        let event = {
            jobs: [constants.heartbeatRedis]
        };

        let calledGet = false;
        let calledRaven = false;
        let calledLambda = false;
        let calledEs = false;
        let calledAgWebsite = false;
        let calledRedis = false;
        let aKey = '';
        let aValue = {};

        stubRedisWrite.callsFake(function fakeFn(key, value, cb) {
            calledRedis = true;
            aKey = key;
            aValue = value;
            cb(null, 'ok');
        });

        stubRedisGet.callsFake(function fakeFn(key, cb) {
            calledRedis = true;
            assert.equal(aKey, key, 'wrong key sent to redis');
            cb(null, aValue);
        });

        stubRequestGet.callsFake(function fakeFn(url, cb) {
            calledAgWebsite = true;
            cb(null, null, null);
        });

        stubEs.callsFake(function fakeFn(index, typeName, query, cb) {
            calledEs = true;
            cb(null);
        });

        stubLambda.callsFake(function fakeFn(name, payload, cb) {
            calledLambda = true;
            cb(null);
        });

        stubRavenMessage.callsFake(function fakeFn(msg) {
            console.log('raven called', msg);
            assert.equal(true, msg.indexOf(constants.heartbeatRedis) > -1, 'called raven with wrong message');
            calledRaven = true;
        });

        stubDdbGet.callsFake(function fakeFn(parms, cb) {
            calledGet = true;
            cb(null, { Item: { username: 'xxx' } });
        });

        hb.main(event, {}, function (error, response) {

            assert.equal(false, calledGet, 'called dynamo unnecessarily');
            assert.equal(false, calledRaven, 'called raven unnecessarily');
            assert.equal(false, calledLambda, 'called lambda unnecessarily');
            assert.equal(false, calledEs, 'called elasticsearch unnecessarily');
            assert.equal(false, calledAgWebsite, 'called ag website');
            assert.equal(true, calledRedis, 'did not call redis');
            assert.equal(JSON.stringify('No job to run') === response.body, false, 'did not run any jobs');
            assert.equal(200, response.statusCode, 'wrong status code');

            done();
        });

    });

    it('redis - dead on write', function (done) {

        let event = {
            jobs: [constants.heartbeatRedis]
        };

        let calledGet = false;
        let calledRaven = false;
        let calledLambda = false;
        let calledEs = false;
        let calledAgWebsite = false;
        let calledRedis = false;
        let aKey = '';
        let aValue = {};

        stubRedisWrite.callsFake(function fakeFn(key, value, cb) {
            calledRedis = true;
            aKey = key;
            aValue = value;
            cb('bang', null);
        });

        stubRedisGet.callsFake(function fakeFn(key, cb) {
            calledRedis = true;
            assert.equal(aKey, key, 'wrong key sent to redis');
            cb(null, aValue);
        });

        stubRequestGet.callsFake(function fakeFn(url, cb) {
            calledAgWebsite = true;
            cb(null, null, null);
        });

        stubEs.callsFake(function fakeFn(index, typeName, query, cb) {
            calledEs = true;
            cb(null);
        });

        stubLambda.callsFake(function fakeFn(name, payload, cb) {
            calledLambda = true;
            cb(null);
        });

        stubRavenMessage.callsFake(function fakeFn(msg) {
            console.log('raven called', msg);
            assert.equal(true, msg.indexOf(constants.heartbeatRedis) > -1, 'called raven with wrong message');
            calledRaven = true;
        });

        stubDdbGet.callsFake(function fakeFn(parms, cb) {
            calledGet = true;
            cb(null, { Item: { username: 'xxx' } });
        });

        hb.main(event, {}, function (error, response) {

            assert.equal(false, calledGet, 'called dynamo unnecessarily');
            assert.equal(true, calledRaven, 'did not call raven');
            assert.equal(false, calledLambda, 'called lambda unnecessarily');
            assert.equal(false, calledEs, 'called elasticsearch unnecessarily');
            assert.equal(false, calledAgWebsite, 'called ag website');
            assert.equal(true, calledRedis, 'did not call redis');
            assert.equal(JSON.stringify('No job to run') === response.body, false, 'did not run any jobs');
            assert.equal(500, response.statusCode, 'wrong status code');

            done();
        });

    });

    it('redis - dead on read', function (done) {

        let event = {
            jobs: [constants.heartbeatRedis]
        };

        let calledGet = false;
        let calledRaven = false;
        let calledLambda = false;
        let calledEs = false;
        let calledAgWebsite = false;
        let calledRedis = false;
        let aKey = '';
        let aValue = {};

        stubRedisWrite.callsFake(function fakeFn(key, value, cb) {
            calledRedis = true;
            aKey = key;
            aValue = value;
            cb(null, 'ok');
        });

        stubRedisGet.callsFake(function fakeFn(key, cb) {
            calledRedis = true;
            assert.equal(aKey, key, 'wrong key sent to redis');
            cb('bang', null);
        });

        stubRequestGet.callsFake(function fakeFn(url, cb) {
            calledAgWebsite = true;
            cb(null, null, null);
        });

        stubEs.callsFake(function fakeFn(index, typeName, query, cb) {
            calledEs = true;
            cb(null);
        });

        stubLambda.callsFake(function fakeFn(name, payload, cb) {
            calledLambda = true;
            cb(null);
        });

        stubRavenMessage.callsFake(function fakeFn(msg) {
            console.log('raven called', msg);
            assert.equal(true, msg.indexOf(constants.heartbeatRedis) > -1, 'called raven with wrong message');
            calledRaven = true;
        });

        stubDdbGet.callsFake(function fakeFn(parms, cb) {
            calledGet = true;
            cb(null, { Item: { username: 'xxx' } });
        });

        hb.main(event, {}, function (error, response) {

            assert.equal(false, calledGet, 'called dynamo unnecessarily');
            assert.equal(true, calledRaven, 'did not call raven');
            assert.equal(false, calledLambda, 'called lambda unnecessarily');
            assert.equal(false, calledEs, 'called elasticsearch unnecessarily');
            assert.equal(false, calledAgWebsite, 'called ag website');
            assert.equal(true, calledRedis, 'did not call redis');
            assert.equal(JSON.stringify('No job to run') === response.body, false, 'did not run any jobs');
            assert.equal(500, response.statusCode, 'wrong status code');

            done();
        });

    });

    it('redis - bad read', function (done) {

        let event = {
            jobs: [constants.heartbeatRedis]
        };

        let calledGet = false;
        let calledRaven = false;
        let calledLambda = false;
        let calledEs = false;
        let calledAgWebsite = false;
        let calledRedis = false;
        let aKey = '';
        let aValue = {};

        stubRedisWrite.callsFake(function fakeFn(key, value, cb) {
            calledRedis = true;
            aKey = key;
            aValue = value;
            cb(null, 'ok');
        });

        stubRedisGet.callsFake(function fakeFn(key, cb) {
            calledRedis = true;
            assert.equal(aKey, key, 'wrong key sent to redis');
            cb(null, { other: 2 });
        });

        stubRequestGet.callsFake(function fakeFn(url, cb) {
            calledAgWebsite = true;
            cb(null, null, null);
        });

        stubEs.callsFake(function fakeFn(index, typeName, query, cb) {
            calledEs = true;
            cb(null);
        });

        stubLambda.callsFake(function fakeFn(name, payload, cb) {
            calledLambda = true;
            cb(null);
        });

        stubRavenMessage.callsFake(function fakeFn(msg) {
            console.log('raven called', msg);
            assert.equal(true, msg.indexOf(constants.heartbeatRedis) > -1, 'called raven with wrong message');
            calledRaven = true;
        });

        stubDdbGet.callsFake(function fakeFn(parms, cb) {
            calledGet = true;
            cb(null, { Item: { username: 'xxx' } });
        });

        hb.main(event, {}, function (error, response) {

            assert.equal(false, calledGet, 'called dynamo unnecessarily');
            assert.equal(true, calledRaven, 'did not call raven');
            assert.equal(false, calledLambda, 'called lambda unnecessarily');
            assert.equal(false, calledEs, 'called elasticsearch unnecessarily');
            assert.equal(false, calledAgWebsite, 'called ag website');
            assert.equal(true, calledRedis, 'did not call redis');
            assert.equal(JSON.stringify('No job to run') === response.body, false, 'did not run any jobs');
            assert.equal(500, response.statusCode, 'wrong status code');

            done();
        });

    });
});
