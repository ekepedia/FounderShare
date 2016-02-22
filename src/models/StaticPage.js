/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */

/**
 * Represents the schema for StaticPage.
 *
 * @author TCSASSEMBLER
 * @version 1.0
 */
'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var StaticPageSchema = new Schema({
    name: {type: String, required: true, index: true, unique: true},
    content: {type: String, required: false}
});

StaticPageSchema.plugin(require('mongoose-paginate'));

module.exports = StaticPageSchema;
