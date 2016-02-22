/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */

/**
 * Represents the base schema for Type schemas.
 *
 * @author TCSASSEMBLER
 * @version 1.0
 */
'use strict';

module.exports = {
    _id: {
        type: Number,
        required: true,
        index: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    }
};