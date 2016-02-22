/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */
/**
 * This script generates a postman environment file with valid user
 * sessions.
 *
 * @version 1.0
 * @author TCSASSEMBLER
 */
'use strict';


var _ = require('underscore');
var async = require('async');
var fs = require('fs');
var path = require('path');
var template = require('./env_template.json');
var config = require('./config.json');
var logging = require('../src/common/logging');
var SecurityService = require('../src/services/SecurityService');
var BusinessService = require('../src/services/BusinessService');
var GiftCardOfferService = require('../src/services/GiftCardOfferService');
var GiftCardService = require('../src/services/GiftCardService');

var outputPath = path.join(__dirname, '..', 'Mom-and-Pop.postman_environment'); 

/* Deactivate Logging */
logging.logger.clear();

/* Save Ids for later use. Each Id is indexed by its key (e.g. USER1, B1) */
var cachedIds = {};

/**
 * Login user given an email and password
 * @param {String} email the email
 * @param {String} password the password
 * @param {Function} callback the callback function with arguments:
 * - error
 * - token
 */
function loginUser(email, password, callback) {
    var userId;
    async.waterfall([
	function(cb) {
	    SecurityService.authenticate(email, password, cb);
	}, function(user, cb) {
	    userId = user.id;
	    SecurityService.generateSessionToken(userId, cb);
	}], function(error, token) {
	    callback(error, userId, token);
	});
}

/* Construct postman environment */
async.waterfall([
    function(cb) {
	/* Set the API base URL as environment values in the postman
	 * environment structure */
	template.values.push({
	    key: 'URL',
	    value: config.URL,
	    type: 'text',
	    name: 'URL',
	    enabled: true
	});
	console.log('API base URL set to ' + config.URL);
	cb();
    }, function(outer_cb) {
	/* Go through all users and create a valid session (i.e. log
	 * them in). Then save all session tokens as environment
	 * values in the postman environment structure. */
	async.each(config.users, function(user, callback) {
	    loginUser(user.email, user.password, function(err, userId, token) {
		if (err) {
		    return callback(err);
		}
		template.values.push({
		    key: user.key_token,
		    value: token,
		    type: 'text',
		    name: user.key_token,
		    enabled: true
		});
		template.values.push({
		    key: user.key_id,
		    value: userId,
		    type: 'text',
		    name: user.key_id,
		    enabled: true
		});
		cachedIds[user.key_id] = userId;
		console.log('User ' + user.email + ' successfully logged in.');
		callback();
	    });
	}, outer_cb);
    }, function(outer_cb) {
	/* Find valid BusinessIds of all businesses listed in
	 * config.businesses and set them as environment variable in
	 * the postman env structure. */
	async.each(config.businesses, function(business, callback) {
	    BusinessService.search({businessName: business.name + '$'}, function(err, result) {
		if (err) {
		    return callback(err);
		}
		if (!result || !result.totalRecords) {
		    return callback(new Error('No business found with name ' + business.name));
		}
		template.values.push({
		    key: business.key,
		    value: result.items[0].id,
		    type: 'text',
		    name: business.key,
		    enabled: true
		});
		cachedIds[business.key] = result.items[0].id;
		console.log('Business ' + result.items[0].name + ' added to environment.');
		callback();
	    });
	}, outer_cb);
    }, function(outer_cb) {
	/* Find as many GiftCardOffers as set in
	 * config.giftCardOffers.STATUS.num for each STATUS and set
	 * their Ids as environment variable in the postman env
	 * structure. The offers all belong to B1. */
	async.each(config.giftCardOffers, function(offer, callback) {
	    GiftCardOfferService.search({status: offer.status, pageSize: offer.num, businessId: cachedIds['B1']}, function(err, result) {
		if (err) {
		    return callback(err);
		}
		if (!result || !result.totalRecords) {
		    return callback(new Error('No GiftCardOffer found with status ' + offer.status));
		}
		if (result.totalRecords < offer.num) {
		    return callback(new Error('Not enough GiftCardOffers found with status ' + offer.status + '. Expected: ' + offer.num + ', Found: ' + result.totalRecords));
		}
		_.each(result.items, function(item, index) {
		    var key = offer.keyPrefix + (index + 1);
		    template.values.push({
			key: key,
			value: item.id,
			type: 'text',
			name: key,
			enabled: true
		    });
		    console.log('GiftCardOffer ' + item.id + ' added to environment.');
		    GiftCardOfferService.getComments(item.id, function(err, comments) {
			if (comments.length) {
			    template.values.push({
				key: key + '_COMMENT',
				value: comments[0].id,
				type: 'text',
				name: key + '_COMMENT',
				enabled: true
			    });
			    console.log('GiftCardOffer comment ' + key + '_COMMENT added to environment.');
			}
		    });
		});
		callback();
	    });
	}, outer_cb);
    }, function(outer_cb) {
	/* Find GiftCards and set their Ids (as GCx_y) and QR code (as
	 * QRx_y) as environment variable in the postman env structure.
	 * GC1_x belongs to USER1, QR1_x corresponds to a GiftCard of
	 * B1, etc. */
	async.parallel([
	    function(callback) {
		async.each(config.giftCards, function(gc, callback) {
		    GiftCardService.search({ownerId: cachedIds[gc.owner], pageSize: gc.num}, function(err, result) {
			if (err) {
			    return callback(err);
			}
			if (!result || !result.totalRecords) {
			    return callback(new Error('No GiftCard found with owner ' + gc.owner));
			}
			if (result.totalRecords < gc.num) {
			    return callback(new Error('Not enough GiftCards found with owner ' + gc.owner + '. Expected: ' + gc.num + ', Found: ' + result.totalRecords));
			}
			_.each(result.items, function(item, index) {
			    var key = gc.keyPrefix + (index + 1);
			    template.values.push({
				key: key,
				value: item.id,
				type: 'text',
				name: key,
				enabled: true
			    });
			    console.log('GiftCard ' + item.id + ' added to environment.');
			});
			callback();
		    });
		}, callback);
	    }, function(callback) {
		async.each(config.qrCodes, function(qr, callback) {
		    GiftCardService.search({businessId: cachedIds[qr.business], pageSize: qr.num}, function(err, result) {
			if (err) {
			    return callback(err);
			}
			if (!result || !result.totalRecords) {
			    return callback(new Error('No GiftCard found with business ' + qr.business));
			}
			if (result.totalRecords < qr.num) {
			    return callback(new Error('Not enough GiftCards found with business ' + qr.business + '. Expected: ' + qr.num + ', Found: ' + result.totalRecords));
			}
			_.each(result.items, function(item, index) {
			    var key = qr.keyPrefix + (index + 1);
			    template.values.push({
				key: key,
				value: item.currentQRCode,
				type: 'text',
				name: key,
				enabled: true
			    });
			    console.log('QRCode ' + item.currentQRCode + ' added to environment.');
			});
			callback();
		    });
		}, callback);
	    }], outer_cb);
    }], function(err) {
	if (err) {
	    console.error(err);
	}

	// Generate blank environmental variables for forum
	var forumVars = [
		{ key: 'Section1',
   	value: 'REPLACE WITH SECTION ID',
   	type: 'text',
   	name: 'Section',
   	enabled: true },
   	{ key: 'Section2',
   	value: 'REPLACE WITH SECTION ID',
   	type: 'text',
   	name: 'Section',
   	enabled: true },
   	{ key: 'Thread1',
   	value: 'REPLACE WITH THREAD ID',
   	type: 'text',
   	name: 'Thread1',
   	enabled: true },
   	{ key: 'Thread2',
   	value: 'REPLACE WITH THREAD ID',
   	type: 'text',
   	name: 'Thread2',
   	enabled: true },
   	{ key: 'Post1',
   	value: 'REPLACE WITH POST ID',
   	type: 'text',
   	name: 'Post1',
   	enabled: true },
   	{ key: 'Post2',
   	value: 'REPLACE WITH POST ID',
   	type: 'text',
   	name: 'Post2',
   	enabled: true },
	]
	// Add forum variables to tempate
	template.values = _.union(template.values, forumVars);

	/* Write postman environment file */
	var strJson = JSON.stringify(template, null, 4);
	fs.writeFileSync(outputPath, strJson);
	console.log('Postman environment written to ' + outputPath);
	process.exit(0);
    });
