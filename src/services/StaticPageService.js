/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */
/**
 * This service provides methods to manage static pages.
 *
 * @version 1.0
 * @author TCSASSEMBLER
 */
'use strict';

var _ = require('underscore');
var async = require('async');
var validate = require("../common/validator").validate;
var logging = require("../common/logging");
var helper = require("../common/helper");
var BadRequestError = require("../common/errors").BadRequestError;
var StaticPage = require('../models').StaticPage;

/**
 * Create a static page.
 * @param {StaticPage} page the static page
 * @param {function(Error, StaticPage)} callback the callback function with arguments
 * - the error
 * - the created object
 */
function create(page, callback) {
    var error = validate(
        {page: page},
        {
            page: {
                __obj: true,
                name: "ShortString?",
                content: "LongString?"
            }
        });
    if (error) {
        return callback(error);
    }
    async.waterfall([
        function (cb) {
            StaticPage.create(page, cb);
        }
    ], function (err, result) {
	if (err && err.code === 11000) {
	    err = new BadRequestError("A page with that name already exists", err);
	}
        callback(err, _.toJSON(result));
    });
}

/**
 * Get a static page.
 * @param id {String} the page id
 * @param {function(Error, StaticPage)} callback the callback function with arguments
 * - the error
 * - the found object or null if not found
 */
function get(id, callback) {
    var error = validate(
        {id: id},
        {id: "ObjectId"});
    if (error) {
        return callback(error);
    }
    StaticPage.findById(id).exec(function (err, result) {
        callback(err, _.toJSON(result));
    });
}

/**
 * Get static page by name
 * @param {String} name the page name
 *
 * @param {function(Error, StaticPage)} callback the callback function with arguments
 * - the error
 * - the found object or null if not found
 */
function getByName(name, callback) {
    var error = validate(
        {name: name},
        {name: "ShortString"});
    if (error) {
        return callback(error);
    }
    StaticPage.findOne({name: name}, function (err, result) {
        callback(err, _.toJSON(result));
    });
}

/**
 * Update static page.
 * @param {ObjectId} id the page id
 * @param {StaticPage} page the values to update
 * @param {function(Error, StaticPage)} callback the callback function with arguments
 * - the error
 * - the updated object
 */
function update(id, page, callback) {
    var error = validate(
        {id: id, page: page},
        {
            id: "ObjectId", page: {
            __obj: true,
            name: "ShortString?",
	    content: { type: "String", empty: true}
        }
        });
    if (error) {
        return callback(error);
    }

    var existing;
    async.waterfall([
        function (cb) {
            helper.ensureExists(StaticPage, id, cb);
        }, function (result, cb) {
            existing = result;
	    // Trim white spaces
	    page.content = page.content.trim();
            _.extend(existing, page);
            existing.save(cb);
        }
    ], function (err/*, result*/) {
        callback(err, _.toJSON(existing));
    });
}

/**
 * Delete static page.
 * @param {ObjectId} id the page id
 * @param {function(Error)} callback the callback function with arguments
 * - the error
 */
function remove(id, callback) {
    var error = validate(
        {id: id},
        {id: "ObjectId"});
    if (error) {
        return callback(error);
    }

    async.waterfall([
        function (cb) {
            helper.ensureExists(StaticPage, id, cb);
        }, function (result, cb) {
	    var page = result;
	    page.remove(cb);
	}
    ], callback.errorOnly());
}


/**
 * Search static page with criteria.
 * @param {BaseSearchCriteria} criteria the criteria
 * @param {String} [criteria.pageName] the page name to match (partial matching)
 * @param {ObjectId[]} [criteria.ids] the object ids to match
 * @param {function(Error, PaginationResult)} callback the callback function with arguments
 * - the error
 * - the search result
 */
function search(criteria, callback) {
    var error = validate(
        {criteria: criteria},
        {
            criteria: {
                pageSize: "PageSize?",
                pageNumber: "PageNumber?",
                sortBy: "ShortString?",
                sortOrder: "SortOrder?",
                pageName: "ShortString?",
                ids: {type: ["ObjectId"], required: false}
            }
        });
    if (error) {
        return callback(error);
    }
    var filter = _.omit(criteria, 'pageName', 'ids');

    if (criteria.pageName) {
        filter.name = {
            '$regex': criteria.pageName,
            '$options': 'i'
        };
    }

    if (criteria.ids) {
        filter._id = {
            $in: criteria.ids
        };
    }
    helper.paginationSearch(StaticPage, filter, function (err, result) {
        callback(err, _.toJSON(result));
    });
}


module.exports = {
    create: logging.createWrapper(create, {
        input: ["page"],
        output: ["page"],
        signature: "StaticPageService#create"
    }),
    get: logging.createWrapper(get, {
	input: ["id"],
	output: ["page"],
	signature: "StaticPageService#get"
    }),
    getByName: logging.createWrapper(getByName, {
	input: ["name"],
	output: ["page"],
	signature: "StaticPageService#getByName"
    }),
    update: logging.createWrapper(update, {
        input: ["id", "page"],
        output: ["page"],
        signature: "StaticPageService#update"
    }),
    delete: logging.createWrapper(remove, {
	input: ["id"],
	output: [],
	signature: "StaticPageService#remove"
    }),
    search: logging.createWrapper(search, {
        input: ["criteria"],
        output: ["results"],
        signature: "StaticPageService#search"
    })
};
