/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */

/**
 * Migration script for assembly http://community.topcoder.com/tc?module=ProjectDetail&pj=30051081&tab=results
 * 
 * 
 * This script fixes following fields:
 * - GiftCard: oldQRCode, currentQRCode
 *
 * Changes in version 1.1
 * - Use static pages from test_files/seed-data/staticPages.json
 * - Check if GiftCard has a qrCode before updating
 *
 * @author TCSASSEMBLER
 * @version 1.1
 */
"use strict";

require("../src/common/function-utils");
var Const = require("../src/Const");
var _ = require('underscore');
var async = require('async');
var GiftCard = require('../src/models').GiftCard;
var StaticPage = require('../src/models').StaticPage;
var staticPages = require("../test_files/seed-data/staticPages.json");


/**
 * Rename GiftCard#qrCode to GiftCard#currentQRCode
 * @param {Function(Error)} callback the callback
 */
function fixQRCode(callback) {
    async.waterfall([
        function (cb) {
            GiftCard.find({}, cb);
        }, function (giftCards, cb) {
            async.each(giftCards, function (giftCard, cb) {
		var qrCode = giftCard.get('qrCode');
		if (qrCode && !giftCard.currentQRCode) {
		    giftCard.currentQRCode = qrCode;
		    giftCard.oldQRCode = null;
		    giftCard.save(cb);
		    console.log("Updated GiftCard " + giftCard.id);
		} else {
		    cb();
		}
            }, cb);
        }
    ], function (err) {
        if (err) {
            console.log("fixQRCode error")
        } else {
            console.log("fixQRCode done")
        }
        callback(err);
    });
}

/**
 * Create static pages
 * @param {Function(Error)} callback the callback
 */
function createStaticPages(callback) {
    StaticPage.create(staticPages, function(err) {
	if (err) {
            console.log("createStaticPages error")
        } else {
            console.log("createStaticPages done")
        }
        callback(err);
    });
}


async.series([
    fixQRCode,
    createStaticPages
], function (err) {
    if (err) {
        console.log(err);
        throw err;
    }
    console.log("\nSUCCESS");
    process.exit();
});
