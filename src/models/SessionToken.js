/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */

/**
 * Represents the schema for Session Token.
 *
 * @author TCSASSEMBLER
 * @version 1.0
 */
'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.Types.ObjectId;

module.exports = new Schema({
    userId: {type: ObjectId, required: true},
    token: {type: String, unique: true, index: true},
    expirationDate: {type: Date, required: true}
});
