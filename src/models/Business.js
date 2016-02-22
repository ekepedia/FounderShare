/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */

/**
 * Represents the schema for Business.
 *
 * Changes in version 1.1:
 *  - Updated the address logic.
 * Changes in version 1.2:
 * - Add giftCardSeq
 *
 * Changes in version 1.3 (Project Mom and Pop - MiscUpdate5):
 * - Remove conditions field
 *
 * @author TCSASSEMBLER
 * @version 1.3
 */
'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var BusinessSchema = new Schema({
    name: String,
    type: Number,
    streetAddress: String,
    city: String,
    state: String,
    country: String,
    zip: String,
    telephoneNumber: String,
    picture: String,
    businessHours: String,
    description: String,
    website: String,

    isVerified: {type: Boolean, default: false},
    isVerificationFeePaid: {type: Boolean, default: false},
    isSubscriptionExpired: {type: Boolean, default: false},

    braintreeAccountId: String,
    subscriptionId: String,
    coordinates: [Number],
    notificationDate: Date,
    verificationDate: Date,

    giftCardSeq: {type: Number, default: 0}
});

BusinessSchema.plugin(require('mongoose-paginate'));

module.exports = BusinessSchema;
