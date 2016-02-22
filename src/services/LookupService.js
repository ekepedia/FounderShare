/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */
/**
 * This service provides methods to receive lookup values.
 *
 * @version 1.0
 * @author TCSASSEMBLER
 */
'use strict';

var logging = require("../common/logging");
var BusinessType = require('../models').BusinessType;
var FeedbackType = require('../models').FeedbackType;


/**
 * Service to get all feedback types from database.
 * @param {function(Error, FeedbackType[])} callback the callback function with arguments
 * - the error
 * - the results
 */
function getAllFeedbackTypes(callback) {
    FeedbackType.find(callback);
}

/**
 * Service to get all business types from database.
 * @param {function(Error, BusinessType[])} callback the callback function with arguments
 * - the error
 * - the results
 */
function getAllBusinessTypes(callback) {
    BusinessType.find(callback);
}


module.exports = {
    getAllFeedbackTypes: logging.createWrapper(getAllFeedbackTypes, {
        input: [],
        output: ["feedbackTypes"],
        signature: "LookupService#getAllFeedbackTypes"
    }),
    getAllBusinessTypes: logging.createWrapper(getAllBusinessTypes, {
        input: [],
        output: ["businessTypes"],
        signature: "LookupService#getAllBusinessTypes"
    })
};
