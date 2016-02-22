/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */

/**
 * Represents the schema for Gift Card Offer Comment.
 *
 * @author TCSASSEMBLER
 * @version 1.0
 */
'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.Types.ObjectId;

module.exports = new Schema({
    giftCardOfferId: {type: ObjectId, required: true, index: true},
    userId: {type: ObjectId, required: true},
    username: {type: String, required: true},
    comment: {type: String, required: true},
    timestamp: {type: Date, default: Date.now}
});
