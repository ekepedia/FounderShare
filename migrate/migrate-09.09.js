/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */
/**
 * Migration script for assembly https://www.topcoder.com/challenge-details/30051308/?type=develop
 *
 * This script removes the Business#conditions field and transforms
 * the GiftCardOffer#conditions field into a plain String.
 *
 * Also, it removes the GIFT_CARD_ prefix from the ActionRecord type field.
 *
 * @author TCSASSEMBLER
 * @version 1.0
 */
"use strict";

require("../src/common/function-utils");
var Const = require("../src/Const");
var _ = require('underscore');
var async = require('async');
var Business = require('../src/models').Business;
var GiftCardOffer = require('../src/models').GiftCardOffer;
var ActionRecord = require('../src/models').ActionRecord;


/**
 * Remove Business#conditions
 * @param {Function(Error)} callback the callback
 */
function fixBusinessConditions(callback) {
    async.waterfall([
        function (cb) {
	    Business.collection.update({conditions: {$exists: true}}, {$unset: {conditions: 1}}, {multi: true}, cb);
	}
    ], function (err, updated) {
        if (err) {
            console.log("fixBusinessConditions error")
        } else {
            console.log("fixBusinessConditions done. Updated:", updated)
        }
        callback(err);
    });
}

/**
 * Fix GiftCardOffer#conditions
 * @param {Function(Error)} callback the callback
 */
function fixGiftCardOfferConditions(callback) {
    async.waterfall([
        function (cb) {
	    GiftCardOffer.find({
		conditions: {$exists: true},
		$where : "Array.isArray(this.conditions)"
	    }, cb);
	}, function(offers, cb) {
	    async.each(offers, function(offer, cb) {
		offer.conditions = '';
		offer.save(cb);
	    }, function(err) {
		cb(err);
	    });
	}
    ], function (err) {
        if (err) {
            console.log("fixGiftCardOfferConditions error")
        } else {
            console.log("fixGiftCardOfferConditions done.")
        }
        callback(err);
    });
}

/**
 * Fix ActionRecord#type
 * @param {Function(Error)} callback the callback
 */
function fixActionRecordType(callback) {
    async.waterfall([
        function (cb) {
	    ActionRecord.find({type: {$regex: /^GIFT_CARD_/}}, cb);
	}, function(result, cb) {
	    async.each(result, function(ar, cb) {
		ar.type = ar.type.replace('GIFT_CARD_', '');
		ar.save(cb);
	    }, function(err) {
		cb(err);
	    });
	}
    ], function (err) {
        if (err) {
            console.log("fixActionRecordType error")
        } else {
            console.log("fixActionRecordType done.")
        }
        callback(err);
    });
}

async.series([
    fixBusinessConditions,
    fixGiftCardOfferConditions,
    fixActionRecordType
], function (err) {
    if (err) {
        console.error(err);
        throw err;
    }
    console.log("\nSUCCESS");
    process.exit();
});
