/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */

/**
 * Migration script for assembly http://community.topcoder.com/tc?module=ProjectDetail&pj=30051081&tab=results
 * 
 * 
 * This script removes the index on the deprecated GiftCard#qrCode field
 * 
 * @author TCSASSEMBLER
 * @version 1.0
 */
"use strict";

require("../src/common/function-utils");
var Const = require("../src/Const");
var _ = require('underscore');
var async = require('async');
var GiftCard = require('../src/models').GiftCard;


/**
 * Rename GiftCard#qrCode to GiftCard#currentQRCode
 * @param {Function(Error)} callback the callback
 */
function fixQRCodeIndex(callback) {
    async.waterfall([
        function (cb) {
	    GiftCard.collection.getIndexes(cb);
	}, function (indexes, cb) {
	    if (!indexes.qrCode_1) {
		return cb(null);
	    }
            GiftCard.collection.dropIndex('qrCode_1', cb);
        }
    ], function (err) {
        if (err) {
            console.log("fixQRCodeIndex error")
        } else {
            console.log("fixQRCodeIndex done")
        }
        callback(err);
    });
}


async.series([
    fixQRCodeIndex
], function (err) {
    if (err) {
        console.error(err);
        throw err;
    }
    console.log("\nSUCCESS");
    process.exit();
});
