/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */

/**
 * Represents the schema for Gift Card Gift (Gift Card that has been gifted).
 *
 * @author TCSASSEMBLER
 * @version 1.0
 */
'use strict';

var mongoose = require('mongoose'),
    _ = require('underscore'),
    Const = require("../Const"),
    Schema = mongoose.Schema,
    ObjectId = Schema.Types.ObjectId,
    Mixed = Schema.Types.Mixed;

var GiftCardGiftSchema = new Schema({
    sourceGiftCardId: {type: ObjectId, required: true},
    targetGiftCardId: {type: ObjectId},
    quantity: {type: Number, required: true},
    code: {type: String, required: true, index: true, unique: true},
    status: {type: String, required: true, enum: _.values(Const.GiftCardGiftStatus)},
    type: {type: String, required: true, enum: _.values(Const.GiftCardGiftType)},
    createdAt: {type: Date, default: Date.now},
    expiredAt: {type: Date },
    isDelivered: {type: Boolean, default: false},
    //may contain any additional info e.g. required twitter handle
    metadata: {type: Mixed, default: {}},
    //email id or sms id
    messageId: {type: String, index: true}
});



module.exports = GiftCardGiftSchema;