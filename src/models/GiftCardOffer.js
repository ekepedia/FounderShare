/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */

/**
 * Represents the schema for Gift Card Offer.
 *
 * Changes in 1.1:
 *  - Updated the business address logic.
 *
 * Changes in 1.2
 * - add businessWebsite
 *
 * Changes in 1.3 (Project Mom and Pop - Gift Card Offers Search and View):
 * - Add businessCoordinates, activationDateTime_floored, expirationDate_floored
 * - Add pre validate hook
 *
 * Changes in 1.4 (Project Mom and Pop - MiscUpdate5):
 * - conditions is now of type String (it was [String] before)
 *
 * Changes in version 1.5 (Project Mom and Pop - Release Fall 2015 Assembly):
 * - [PMP-240] add businessDescription
 * 
 * @author TCSASSEMBLER
 * @version 1.5
 */
'use strict';

var mongoose = require('mongoose'),
    _ = require('underscore'),
    Const = require("../Const"),
    helper = require("../common/helper"),
    Schema = mongoose.Schema,
    ObjectId = Schema.Types.ObjectId;

var GiftCardOfferSchema = new Schema({
    businessId: {type: ObjectId, required: true},
    businessName: {type: String, required: true},
    businessDescription: {type: String, required: false},
    businessType: {type: Number, required: true},
    businessStreetAddress: {type: String, required: false},
    businessCity: {type: String, required: false},
    businessState: {type: String, required: false},
    businessCountry: {type: String, required: false},
    businessZip: {type: String, required: false},
    businessPicture: {type: String, required: true},
    businessTelephone: {type: String, required: true},
    businessWebsite: {type: String, required: true},
    businessCoordinates: {type: [Number], required: true},
    discount: {type: Number, required: true},
    activationDateTime: {type: Date, required: true},
    activationDateTime_floored: {type: Date, required: true},
    endDateTime: {type: Date, required: true},
    description: {type: String, required: true},
    availableQuantity: {type: Number, required: true},
    status: {type: String, required: true, enum: _.values(Const.GiftCardOfferStatus)},
    totalQuantity: {type: Number, required: true},

    expirationDate: {type: Date, required: true},
    expirationDate_floored: {type: Date, required: true},
    conditions: {type: String, required: false},
    redeemedQuantity: {type: Number, default: 0},
    viewCount: {type: Number, default: 0},
    sharedCount: {type: Number, default: 0},

    numberOfGiftCard: {type: Number, default: 0},

    createdOn: {type: Date, required: false, default: Date.now},
    createdBy: {type: String, required: true},
    modifiedOn: {type: Date, required: false, default: Date.now},
    modifiedBy: {type: String, required: true}
});

GiftCardOfferSchema.index({businessCoordinates:"2dsphere"});



GiftCardOfferSchema.pre('validate', function(next) {
    //round to full days
    if (this.activationDateTime) {
        this.activationDateTime_floored = helper.roundToFullDays(this.activationDateTime);
    }
    if (this.expirationDate) {
        this.expirationDate_floored = helper.roundToFullDays(this.expirationDate);
    }
    next();
});

GiftCardOfferSchema.plugin(require('mongoose-paginate'));

module.exports = GiftCardOfferSchema;
