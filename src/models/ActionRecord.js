/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */

/**
 * Represents the schema for Action Record.
 *
 * @author TCSASSEMBLER
 * @version 1.3
 *
 * Changes in 1.1:
 * - Add metadata property
 *
 * Changes in 1.2
 * - Add businessName property
 * - Make businessId optional
 *
 * Changes in version 1.3 (Project Mom and Pop - Release Fall 2015 Assembly):
 * - [PMP-233] Add amount
 * - [PMP-233] Add giftCardId
 * - [PMP-233] Add giftCardOfferId
 * - [PMP-233] Add target
 * - [PMP-224] Add experienceRating
 */
'use strict';

var mongoose = require('mongoose'),
    _ = require('underscore'),
    mongoosePaginate = require('mongoose-paginate'),
    Const = require("../Const"),
    Schema = mongoose.Schema,
    ObjectId = Schema.Types.ObjectId;

var ActionRecordSchema = new Schema({
    userId: {type: ObjectId, required: true},
    businessId: {type: ObjectId, required: false},
    businessName: {type: String, required: false},
    timestamp: {type: Date, required: true, default: Date.now},
    type: {type: String, required: true, enum: _.values(Const.ActionType)},
    details: {type: String, required: false},
    amount: {type: String, required: false},
    giftCardId: {type: ObjectId, required: false},
    giftCardOfferId: {type: ObjectId, required: false},
    target: {type: String, required: false},
    metadata: {type: Schema.Types.Mixed, required: false},
    experienceRating: {type: [Number], required: false}
});

// add paginate plugin to ActionRecord model
ActionRecordSchema.plugin(mongoosePaginate);

module.exports = ActionRecordSchema;
