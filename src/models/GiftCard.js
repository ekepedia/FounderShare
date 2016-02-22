/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */

/**
 * Represents the schema for Gift Card.
 *
 * @author TCSASSEMBLER
 * @version 1.5
 *
 * Changes in 1.1:
 * 1. add isGiftedToAnotherPerson
 *
 * Changes in 1.2:
 *  - Updated the business address logic.
 *
 * Changes in 1.3:
 * - add readableId, originalQuantity, isGift
 *
 * Changes in 1.4:
 * - add businessWebsite
 *
 * Changes in 1.5:
 * - [PMP-189] remember last QR code in oldQRCode
 * - Rename qrCode to currentQRCode
 */
'use strict';

var mongoose = require('mongoose'),
    _ = require('underscore'),
    Const = require("../Const"),
    Schema = mongoose.Schema,
    ObjectId = Schema.Types.ObjectId;

var GiftCardSchema = new Schema({
    ownerId: {type: ObjectId, required: true, index: true},
    readableId: {type: String, required: true},

    //business fields
    businessId: {type: ObjectId, required: true},
    businessName: {type: String, required: true},
    businessType: {type: Number, required: true},
    businessStreetAddress: {type: String, required: false},
    businessCity: {type: String, required: false},
    businessState: {type: String, required: false},
    businessCountry: {type: String, required: false},
    businessZip: {type: String, required: false},
    businessTelephone: {type: String, required: true},
    businessPicture: {type: String, required: true},
    businessWebsite: {type: String, required: true},

    //offer fields
    giftCardOfferId: {type: ObjectId, required: true},
    description: {type: String, required: true},
    discount: {type: Number, required: true},

    //card information
    originalQuantity: {type: Number, required: true},
    quantity: {type: Number, required: true},
    currentQRCode: {type: String, required: true, index: true, unique: true},
    oldQRCode: {type: String, required: false, index: true},
    status: {type: String, required: true, enum: _.values(Const.GiftCardStatus)},
    giftCardRedeems: [{
        amount: {type: Number, required: true},
        timestamp: {type: Date, required: true, default: Date.now}
    }],

    //this gift card was received as a gift from someone else
    isGift: Boolean,

    createdOn: {type: Date, required: false, default: Date.now},
    createdBy: {type: String, required: true},
    modifiedOn: {type: Date, required: false, default: Date.now},
    modifiedBy: {type: String, required: true}
});


GiftCardSchema.plugin(require('mongoose-paginate'));

module.exports = GiftCardSchema;
