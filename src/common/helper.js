/*
 * Copyright (C) 2015 TopCoder Inc., All Rights Reserved.
 */
/**
 * Contains generic helper methods
 *
 * @version 1.4
 * @author TCSASSEMBLER
 *
 * Changes in 1.1:
 * 1. add shortenLink
 *
 * Changes in 1.2:
 *  - Added missins ";"
 *
 * Changes in 1.3 (Project Mom and Pop - Gift Card Offers Search and View):
 *  - Add: roundToFullDays, getDistanceFromLatLonInKm, makeRegexp, deg2rad
 *
 * Changes in 1.4 (Project Mom and Pop - MiscUpdate5):
 * - Fix missing ';' error
 */
"use strict";

require("./function-utils");

var config = require('config');
var _ = require("underscore");
var request = require("superagent");
var async = require("async");
var util = require('util');
var Const = require("../Const");
var NotFoundError = require("./errors").NotFoundError;
var crypto = require('crypto');
var helper = {};

_.mixin({
    /**
     * Convert obj or array of object to JSON format
     * @param {Object|Array} obj the object or array
     * @returns {*} the json result or array of results
     */
    toJSON: function (obj) {
        if (_.isArray(obj)) {
            return _.map(obj, _.toJSON);
        }
        if (!obj || !obj.toJSON) {
            return obj;
        }
        return obj.toJSON();
    },

    /**
     * Check if two objects are equal.
     * Operator === won't work if one object is type ObjectId and second is type String
     * @param {String|ObjectId} a the first object to compare
     * @param {String|ObjectId} b the second object to compare
     * @returns {boolean} the comparison result
     */
    compareObjectId: function (a, b) {
        if (a && a.toHexString) {
            a = a.toHexString();
        }
        if (b && b.toHexString) {
            b = b.toHexString();
        }
        return a === b;
    }
});

/**
 * Random a string
 * @param {Number} length the expected length
 * @returns {String} the string
 */
helper.randomString = function (length) {
    var chars = 'abcdefghijklmnopqrstuwxyzABCDEFGHIJKLMNOPQRSTUWXYZ0123456789',
        randomBytes = crypto.randomBytes(length),
        result = new Array(length),
        cursor = 0,
        i;
    for (i = 0; i < length; i++) {
        cursor += randomBytes[i];
        result[i] = chars[cursor % chars.length];
    }
    return result.join('');
};

/**
 * Ensure entity exists for given criteria. Return error if no result.
 * @param {Object} Model the mongoose model to query
 * @param {Object|String|Number} criteria the criteria (if object) or id (if string/number)
 * @param {function(Error, Object)} callback the callback function with arguments
 * - the error
 * - the matched object
 */
helper.ensureExists = function (Model, criteria, callback) {
    var query, byId = true;
    if (_.isObject(criteria)) {
        byId = false;
        query = Model.findOne(criteria);
    } else {
        query = Model.findById(criteria);
    }
    query.exec(callback.wrap(function (result) {
        if (!result) {
            var msg;
            if (byId) {
                msg = util.format("%s not found with id: %s", Model.modelName, criteria);
            } else {
                msg = util.format("%s not found with criteria: %j", Model.modelName, criteria);
            }
            callback(new NotFoundError(msg));
        } else {
            callback(null, result);
        }
    }));
};

/**
 * Apply default values to search criteria and fix type conversion
 * @param {BaseSearchCriteria} criteria the criteria
 */
helper.prepareSearchCriteria = function (criteria) {
    _.defaults(criteria, {
        pageSize: Const.DEFAULT_PAGE_SIZE,
        pageNumber: 1,
        sortBy: Const.DEFAULT_SORT_BY,
        sortOrder: Const.DEFAULT_SORT_ORDER
    });
    if (criteria.sortBy === 'id') {
        criteria.sortBy = '_id';
    }
};

/**
 * Get sort object used for Mongo query based on search criteria
 * @param {BaseSearchCriteria} criteria the criteria
 * @returns {Object} the sort object
 */
helper.getSortConditions = function (criteria) {
    var sortBy = {};
    sortBy[criteria.sortBy] = criteria.sortOrder === Const.SortOrder.ASCENDING ? 1 : -1;
    return sortBy;
};

/**
 * Perform a pagination search on model
 * @param {Object} Model the mongoose model
 * @param {BaseSearchCriteria} criteria the mongoose search criteria. It may contain any field used for searching.
 * @param {function(Error, PaginationResult)} callback the callback function with arguments
 * - the error
 * - the search result
 */
helper.paginationSearch = function (Model, criteria, callback) {
    helper.prepareSearchCriteria(criteria);

    var filter = _.omit(criteria, "pageSize", "pageNumber", "sortBy", "sortOrder");
    var sortBy = helper.getSortConditions(criteria);

    async.waterfall([
        function (cb) {
            if (criteria.pageNumber) {
                Model.paginate(filter, criteria.pageNumber, criteria.pageSize, cb, {sortBy: sortBy});
            } else {
                Model.find(filter).sort(sortBy).exec(cb.wrap(function (items) {
                    cb(null, 1, items, items.length);
                }));
            }
        }
    ], callback.wrap(function (totalPages, items, totalRecords) {
        callback(null, {
            totalPages: totalPages,
            pageNumber: criteria.pageNumber,
            totalRecords: totalRecords,
            items: _.toJSON(items)
        });
    }));
};


/**
 * Remove security information from user record
 * @param {User} user the user
 * @returns {User} the user
 */
helper.mapUser = function (user) {
    if (!user) {
        return user;
    }
    user = _.toJSON(user);
    delete user.passwordHash;
    delete user.resetPasswordToken;
    delete user.resetPasswordExpired;
    return user;
};

/**
 * Cast pageNumber and pageSize to number type
 * @param {Object} query the query string
 */
helper.fixQueryStringForSearchCriteria = function (query) {
    if (query.hasOwnProperty("pageSize")) {
        query.pageSize = Number(query.pageSize);
    }
    if (query.hasOwnProperty("pageNumber")) {
        query.pageNumber = Number(query.pageNumber);
    }
};

/**
 * Create shorten version of url
 * @param {String} url the url to short
 * @param {function(Error, String)} callback the callback function with arguments
 * - the error
 * - the new link
 * @since 1.1
 */
helper.shortenLink = function(url, callback) {
    request
        .get(Const.BITLY_BASE_URL + "/v3/shorten")
        .query({
            access_token: config.BITLY_ACCESS_TOKEN,
            longUrl: url
        })
        .end(function (err, res) {
            if (err) {
                return callback(err);
            }
            if (res.body.status_txt !== "OK") {
                return callback(new Error("Bitly shorten fail: " + res.text));
            }
            return callback(null, res.body.data.url);
        });
};


/**
 * Convert degrees to rad
 * @param deg the degrees
 * @returns {number} the rad
 * @since 1.2
 */
helper.deg2rad = function(deg) {
    return deg * (Math.PI/180);
};

/**
 * Escape regex characters in string
 * @param str the string to escape
 * @returns {String} the escaped string
 */
helper.escapeRegExp = function (str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
};

/**
 * Convert given property to regexp
 * @param {Object} criteria the search criteria
 * @param {String} prop the property name
 * @since 1.3
 */
helper.makeRegexp = function (criteria, prop) {
    if (criteria[prop]) {
        criteria[prop] = {
            '$regex': helper.escapeRegExp(criteria[prop]),
            '$options': 'i'
        };
    }
};
/**
 * Get distance between two coordinates
 * @param lat1 the latitude of the first point
 * @param lon1 the longitude of the first point
 * @param lat2 the latitude of the second point
 * @param lon2 the longitude of the second point
 * @returns {number} the distance in kilometers
 * @since 1.3
 */
helper.getDistanceFromLatLonInKm = function (lat1, lon1, lat2, lon2) {
    var R = 6371; // Radius of the earth in km
    var dLat = helper.deg2rad(lat2-lat1);
    var dLon = helper.deg2rad(lon2-lon1);
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(helper.deg2rad(lat1)) * Math.cos(helper.deg2rad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
};

/**
 * Round date to full days
 * @param {Date} date the date to round
 * @returns {Date} the rounded date
 * @since 1.3
 */
helper.roundToFullDays = function (date) {
    //use hours 12, so it will work in different timezone
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
};

module.exports = helper;
