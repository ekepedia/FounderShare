/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */

/**
 * Migration script for assembly https://www.topcoder.com/challenge-details/30051305/?type=develop
 *
 *
 * This script fixes following fields:
 * - GiftCardOffer: businessCoordinates, expirationDate_floored, activationDateTime_floored
 * - Fix coordinates in businesses (first longitude then latitude)
 *
 * @author TCSASSEMBLER
 * @version 1.0
 */
"use strict";


require("../src/common/function-utils");
var Const = require("../src/Const");
var config = require('config');
var _ = require('underscore');
var async = require('async');
var GiftCardOffer = require('../src/models').GiftCardOffer;
var Business = require('../src/models').Business;
var Geocoder = require('node-geocoder');

var geocoder = Geocoder.getGeocoder(config.GEOCODER_PROVIDER, config.GEOCODER_HTTPADAPTER, {});

var id2business;

async.waterfall([
    function (cb) {
        Business.find({}, cb);
    }, function (result, cb) {
        id2business = _.indexBy(result, "id");
        //update coordinates for all business
        //do it with series with timeout, otherwise we get error OVER_QUERY_LIMIT
        async.forEachSeries(result, function (business, cb) {
            if (business.streetAddress) {
                var address = business.streetAddress + ' ' + business.city + ', ' + business.state + ' ' + business.country + ' ' + business.zip;
                geocoder.geocode(address, cb.wrap(function (result) {
                    if (!result.length) {
                        return cb(new BadRequestError("Invalid address or unknown location: " + address));
                    } else if (result.length > 1) {
                        return cb(new BadRequestError("Ambiguous address or unknown location: " + address));
                    }
                    business.coordinates = [result[0].longitude, result[0].latitude];
                    setTimeout(function () {
                        business.save(cb);
                    }, 200);
                }));
            } else {
                cb();
            }
        }, cb);
    }, function (cb) {
        GiftCardOffer.find({}, cb);
    }, function (offers, cb) {
        async.forEach(offers, function (offer, cb) {
            //expirationDate_floored and activationDateTime_floored are computed
            offer.businessCoordinates = id2business[offer.businessId].coordinates;
            offer.save(cb);
        }, cb);
    }
], function (err) {
    if (err) {
        console.log(err);
        throw err;
    }
    console.log("\nSUCCESS");
    process.exit();
});