/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */
/**
 * Use this script to generate sub merchants accounts on braintree.
 *
 * @version 1.0
 * @author TCSASSEMBLER
 */
'use strict';

var braintree = require("braintree");
var async = require("async");
var config = require("config");
var _ = require("underscore");
var gateway = braintree.connect(config.BRAINTREE_GATEWAY_CONFIG);

var count = 10;

var merchantAccountParams = {
    individual: {
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@14ladders.com",
        phone: "5553334444",
        dateOfBirth: "1981-11-19",
        ssn: "456-45-4567",
        address: {
            streetAddress: "111 Main St",
            locality: "Chicago",
            region: "IL",
            postalCode: "60622"
        }
    },
    business: {
        legalName: "Jane's Ladders",
        dbaName: "Jane's Ladders",
        taxId: "98-7654321",
        address: {
            streetAddress: "111 Main St",
            locality: "Chicago",
            region: "IL",
            postalCode: "60622"
        }
    },
    funding: {
        descriptor: "Blue Ladders",
        destination: "bank",
        email: "email@example.com",
        mobilePhone: "5555555555",
        accountNumber: "1123581321",
        routingNumber: "071101307"
    },
    tosAccepted: true,
    masterMerchantAccountId: config.BRAINTREE_MERCHANT_ACCOUNT_ID
};

async.forEach(_.range(1, count + 1), function (nr, cb) {
    var params = JSON.parse(JSON.stringify(merchantAccountParams));
    params.id = "fake_business_" + nr;
    gateway.merchantAccount.create(params, function (err, result) {
        if (err || !result.success) {
            console.log("Failed to create: " + nr);
            console.log(err || result.message);
        } else {
            console.log("Created: " + nr);
        }
        cb();
    });
}, function () {
    process.exit(0);
});
