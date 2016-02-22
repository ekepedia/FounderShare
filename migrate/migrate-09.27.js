/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */
/**
 * Migration script for assembly https://www.topcoder.com/challenge-details/30051472/?type=develop
 *
 * This script applies the following changes:
 *  - User:
 *    + Add signedUpDate
 *    + Add verifiedDate
 *    + Add subscribedToNews
 *  - ActionRecord:
 *    + Add amount
 *    + Add giftCardId
 *    + Add giftCardOfferId
 *    + Add target
 *  - GiftCardOffer:
 *    + Add businessDescription
 *
 * @author TCSASSEMBLER
 * @version 1.0
 */
"use strict";

require("../src/common/function-utils");
var Const = require("../src/Const");
var _ = require('underscore');
var async = require('async');
var User = require('../src/models').User;
var ActionRecord = require('../src/models').ActionRecord;
var Business = require('../src/models').Business;
var GiftCardOffer = require('../src/models').GiftCardOffer;


/**
 * Fix Users
 * @param {Function(Error)} callback the callback
 */
function fixUsers(callback) {
    async.waterfall([
        function (cb) {
	    User.collection.update({signedUpDate: {$exists: false}}, {$set: {signedUpDate: new Date("2015-01-01")}}, {multi: true}, cb);
	},
	function (ignore1, ignore2, cb) {
	    User.collection.update({$and: [{verifiedDate: {$exists: false}}, {$or: [{verifyEmailText: 'verified'}, {verifyEmailText: {$exists: false}}]}]}, {$set: {verifiedDate: new Date("2015-01-01")}}, {multi: true}, cb);
	},
	function (ignore1, ignore2, cb) {
	    User.collection.update({subscribedToNews: {$exists: false}}, {$set: {subscribedToNews: false}}, {multi: true}, cb);
	}
    ], function (err) {
        if (err) {
            console.log("fixUsers error")
        } else {
            console.log("fixUsers done.")
        }
        callback(err);
    });
}

/**
 * Fix ActionRecords
 * @param {Function(Error)} callback the callback
 */
function fixActionRecords(callback) {
    async.waterfall([
        function (cb) {
	    ActionRecord.collection.update({details: {$exists: true}}, {$rename: {details: "amount"}}, {multi: true}, cb);
	},
	function(ignore1, ignore2, cb) {
	    ActionRecord.find({metadata: {$exists: true}, type: {$not: /PLATFORM_ADMIN/i}}, cb);
	},
	function(result, cb) {
	    async.each(result, function(ar, cb) {
		ar.giftCardId = ar.metadata.giftCardId;
		ar.giftCardOfferId = ar.metadata.giftCardOfferId;
		if (ar.metadata.target) {
		    ar.target = ar.metadata.target;
		}
		delete ar.metadata;
		ar.save(cb);
	    }, function(err) {
		cb(err);
	    });
	}
    ], function (err) {
        if (err) {
            console.log("fixActionRecords error")
        } else {
            console.log("fixActionRecords done.")
        }
        callback(err);
    });
}

/**
 * Fix GiftCardOffers
 * @param {Function(Error)} callback the callback
 */
function fixGiftCardOffers(callback) {
    async.waterfall([
        function(cb) {
	    GiftCardOffer.find({businessDescription: {$exists: false}}, cb);
	},
	function(result, cb) {
	    async.each(result, function(offer, cb) {
		Business.findById(offer.businessId, function(err, business) {
		    if (err) {
			return cb(err);
		    }
		    if (!business) {
			return cb(new Error("Business '" + offer.businessId + "' does not exist."));
		    }
		    offer.businessDescription = business.description;
		    offer.save(cb);
		});
	    }, function(err) {
		cb(err);
	    });
	}
    ], function (err) {
        if (err) {
            console.log("fixGiftCardOffers error")
        } else {
            console.log("fixGiftCardOffers done.")
        }
        callback(err);
    });
}

async.series([
    fixUsers,
    fixActionRecords,
    fixGiftCardOffers
], function (err) {
    if (err) {
        console.error(err);
        throw err;
    }
    console.log("\nSUCCESS");
    process.exit();
});
