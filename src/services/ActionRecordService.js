/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */
/**
 * This service provides methods to manage Action Record.
 *
 * @version 1.3
 * @author TCSASSEMBLER
 *
 * Changes in 1.1:
 * 1. Add metadata property in create
 *
 * Changes in version 1.2
 * 1. Add business name to action record
 * 2. Make businessId optional
 *
 * Changes in version 1.3 (Project Mom and Pop - Release Fall 2015 Assembly):
 * - [PMP-233] Add amount
 * - [PMP-233] Add giftCardId
 * - [PMP-233] Add giftCardOfferId
 * - [PMP-233] Add target
 * - [PMP-224] Implement user feedback
 */
'use strict';

var _ = require('underscore');
var async = require('async');
var validate = require("../common/validator").validate;
var logging = require("../common/logging");
var helper = require("../common/helper");
var ActionRecord = require('../models').ActionRecord;
var User = require('../models').User;
var Business = require('../models').Business;

/**
 * Create action record.
 * @param {ActionRecord} actionRecord the action record
 * @param {function(Error, ActionRecord)} callback the callback function with arguments
 * - the error
 * - the created object
 */
function create(actionRecord, callback) {
    var error = validate(
        {actionRecord: actionRecord},
        {
            actionRecord: {
                __obj: true,
                userId: "ObjectId",
                businessId: "ObjectId?",
                timestamp: "Date?",
                businessName: "ShortString?",
                type: "ActionType",
		details: "ShortString?",
                amount: "ShortString?",
		giftCardId: "ObjectId?",
		giftCardOfferId: "ObjectId?",
		target: "ShortString?",
		metadata: "AnyObject?"
            }
        });
    if (error) {
        return callback(error);
    }
    async.waterfall([
        function (cb) {
            helper.ensureExists(User, actionRecord.userId, cb.errorOnly());
        }, function (cb) {
            if (actionRecord.businessId) {
                helper.ensureExists(Business, actionRecord.businessId, cb.errorOnly());
            } else {
                cb();
            }
        }, function (cb) {
            ActionRecord.create(actionRecord, cb);
        }
    ], function (err, result) {
        callback(err, _.toJSON(result));
    });
}

/**
 * Search action records with criteria
 * @param {BaseSearchCriteria} criteria the criteria
 * @param {String} [criteria.type] the action type to match
 * @param {ObjectId} [criteria.userId] the user id to match
 * @param {ObjectId} [criteria.businessId] the business id to match
 * @param {function(Error, PaginationResult)} callback the callback function with arguments
 * - the error
 * - the search result
 */
function search(criteria, callback) {
    var error = validate(
        {criteria: criteria},
        {
            criteria: {
                __obj: true,
                pageSize: "PageSize?",
                pageNumber: "PageNumber?",
                sortBy: "ShortString?",
                sortOrder: "SortOrder?",
                type: "ActionType?",
                userId: "ObjectId?",
                businessId: "ObjectId?"
            }
        });
    if (error) {
        return callback(error);
    }

    helper.paginationSearch(ActionRecord, criteria, callback);
}

/**
 * Set user ratings
 * @param {Object} data the rating data
 * @param {function(Error)} callback the callback function with arguments
 * - the error
 */
function setRatings(data, callback) {
    var error = validate(
        {data: data},
        {
            data: {
                __obj: true,
		__strict: false,
                type: "ActionType?",
                giftCardId: "ObjectId?",
                ratings: "Array"
            }
        });
    if (error) {
        return callback(error);
    }
    async.waterfall([
	function(cb) {
	    ActionRecord.find(_.omit(data, 'ratings')).sort({timestamp: -1}).limit(1).exec(cb);
	},
	function(records, cb) {
	    if (!records.length) {
		return cb(new Error('No action record found'));
	    }
	    var ar = records[0];
	    ar.experienceRating = data.ratings;
	    ar.save(cb);
	}
    ], function(err) {
	callback(err);
    });
}

module.exports = {
    create: logging.createWrapper(create, {
        input: ["actionRecord"],
        output: ["actionRecord"],
        signature: "ActionRecordService#create"
    }),
    search: logging.createWrapper(search, {
        input: ["criteria"],
        output: ["paginationResult"],
        signature: "ActionRecordService#search"
    }),
    setRatings: logging.createWrapper(setRatings, {
        input: ["data"],
        output: [],
        signature: "ActionRecordService#setRatings"
    })
};
