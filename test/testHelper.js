/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */
/**
 * Contains helper methods for testing.
 *
 * Changes in version 1.1:
 * - Update test data
 * - Add StaticPage
 *
 * Changes in version 1.2 (Project Mom and Pop - MiscUpdate5):
 * - Add LongString and LongString_empty validation
 *
 * Changes in version 1.3
 * - Add USER2 and ADMIN to test data
 *
 * @version 1.3
 * @author TCSASSEMBLER
 */
'use strict';

var logger = require("../src/common/logging").logger;
var chai = require("chai");
var assert = chai.assert;
var async = require('async');
var models = require("../src/models");
var _ = require('underscore');

chai.config.includeStack = true;

// disable logging
logger.clear();

var initModels = ["Business", "BusinessType", "User", "ActionRecord", "GiftCardOffer", "GiftCard", "GiftCardOfferComment", "FeedbackType", "SessionToken", "StaticPage"];

var helper = {
    notFoundId: "123456789012345678901234"
};

/**
 * Clear all database data
 * @param {function(Error)} callback the callback function
 */
helper.clearDB = function (callback) {
    async.forEach(_.values(models), function (model, cb) {
        model.remove({}, cb);
    }, callback);
};

/**
 * Clear database and insert test data
 * @param {function(Error, Object)} callback the callback function
 */
helper.resetData = function (callback) {
    var testData = {
        USER1: "55d756d039062f3557b7cac9",
        ADMIN: "5608307417f73e7c266a27b2",
        USER2: "5608307517f73e7c266a3442",
        BUSINESS1: "55d756cf39062f3557b7ca8b",
        BUSINESS10: "55d756cf39062f3557b7ca8e",
        DRAFT_GIFT_CARD_OFFER: "55d756d039062f3557b7cb21",
        ACTIVE_GIFT_CARD_OFFER: "55d756d039062f3557b7cb1c",
        ACTIVE_GIFT_CARD_OFFER2: "55d756d039062f3557b7cb1d"
    };
    async.waterfall([
        function (cb) {
            helper.clearDB(cb);
        }, function (cb) {
            async.forEach(initModels, function (name, cb) {
                var items = JSON.parse(JSON.stringify(require("./data/" + name + ".json"))); //prevent caching
                testData[name] = items;
                models[name].create(items, function(error) {
		    /*
		    console.log(name);
		    if (error) {
			console.error(error);
		    }
		    */
		    cb(error);
		});
            }, cb);
        }, function (cb) {
            _.each(testData, function (values) {
                _.each(values, function (value) {
                    if (value._id) {
                        value.id = value._id;
                        delete value._id;
                    }
                    delete value.__v;
                });
            });
            cb();
        }
    ], function (err) {
	callback(err, testData);
    });
};

/**
 * Assert function will return a validation error in callback
 * @param {Function} callback the callback function
 * @param {String} [expectedPattern] the expected text in error message
 * @param {Number} [statusCode] the expected status code, default 400
 * @returns {Function} the function that will check for an error
 */
helper.assertValidationError = function (callback, expectedPattern, statusCode) {
    return function (err) {
        assert.ok(err);
        assert.equal(err.httpStatus, statusCode || 400);
        if (expectedPattern) {
            assert.isTrue(err.message.indexOf(expectedPattern) !== -1, expectedPattern + " not found in error message: " + err.message);
        }
        callback();
    };
};


/**
 * Assert function will return a not found error in callback
 * @param {Function} callback the callback function
 * @param {String} [expectedPattern] the expected text in error message
 * @returns {Function} the function that will check for an error
 */
helper.assertNotFoundError = function (callback, expectedPattern) {
    return function (err) {
        assert.ok(err);
        assert.equal(err.httpStatus, 404);
        if (expectedPattern) {
            assert.isTrue(err.message.indexOf(expectedPattern) !== -1, expectedPattern + " not found in error message: " + err.message);
        }
        callback();
    };
};

/**
 * Paginate and order in-memory collection and assert to db result
 * @param {Array} actual the actual element that will be paginated
 * @param {Array} expected the expected elements
 * @param {Number} [pageNumber] the page number
 * @param {Number} [pageSize] the page size
 * @param {String|Function} [sortBy] the sort by field or sorting function
 * @param {String} [sortOrder] the sort oder
 * @returns {Array} the paginated items
 */
helper.paginateAndAssert = function (actual, expected, pageNumber, pageSize, sortBy, sortOrder) {
    if (!sortBy) {
        sortBy = "id";
    }
    if (sortBy) {
        actual = _.sortBy(actual, sortBy);
    }
    if (sortOrder === "Descending") {
        actual.reverse();
    }
    if (pageNumber && pageSize) {
        var offset = pageNumber * pageSize - pageSize;
        actual = actual.slice(offset, offset + pageSize);
    }
    assert.equal(actual.length, expected.length, "Both arrays should have same length");
    _.each(actual, function (item, i) {
        assert.equal(item.id, expected[i].id, "Items at index " + i + " don't match");
    });
};

/**
 * Generate tests that verify invalid arguments for a single parameter
 * @param {function(*, Function)} method the method to test
 * @param {String} paramName the name of the parameter being tested
 * @param {Array} values the array of invalid arguments to test
 */
helper.checkInvalidArgument = function (method, paramName, values) {
    values.forEach(function (value) {
        var name, v;
        if (value && value.value && value.displayName) {
            name = value.displayName;
            v = value.value;
        } else {
            v = value;
            name = JSON.stringify(v);
        }
        it(paramName + " is " + name, function (done) {
            method(v, helper.assertValidationError(done, paramName));
        });
    });
};

/**
 * Generate tests that verify invalid many properties for a single object parameter
 * @param {function(*, Function)} method the method to test
 * @param {String} paramName the name of the parameter being tested
 * @param {Object|Function} baseValue the the base value used as an input parameter for a tested function
 *  or accessor function that will return a base value
 * @param {Boolean} [asArray] true if object is wrapped as an array
 * @param {Object} properties the key map of invalid values to apply
 */
helper.checkInvalidProperties = function (method, paramName, baseValue, properties, asArray) {
    _.each(properties, function (propValues, name) {
        var path;
        if (asArray) {
            path = paramName + "[0]." + name;
        } else {
            path = paramName + "." + name;
        }
        helper.checkInvalidArgument(function (propValue, done) {
            var value;
            if (_.isFunction(baseValue)) {
                value = baseValue();
            } else {
                value = JSON.parse(JSON.stringify(baseValue));
            }
            value[name] = propValue;
            method(value, done);
        }, path, propValues);
    });
};

/**
 * Generate tests that verify invalid parameters for base search criteria
 * @param {function(*, Function)} method the method to test
 */
helper.checkInvalidSearchCriteria = function (method) {
    helper.checkInvalidArgument(method, "criteria", helper.INVALID_ARGS.Object);
    helper.checkInvalidProperties(method, "criteria", {}, {
        pageNumber: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.PageNumber),
        pageSize: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.PageSize),
        sortBy: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
        sortOrder: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.Enum)
    });
};

/**
 * Generate tests that verify sorting and pagination
 * @param {Function} allItemsAccessor the function access that return collection of all available items
 * @param {function(*, Function)} method the method to test
 */
helper.verifySearchCriteria = function (allItemsAccessor, method) {
    var pageSize = 5;
    it("should return results for empty criteria", function (done) {
        var allItems = allItemsAccessor();
        method({}, done.wrap(function (result) {
            assert.ok(result);
            assert.equal(result.totalPages, Math.ceil(allItems.length / pageSize));
            assert.equal(result.pageNumber, 1);
            helper.paginateAndAssert(allItems, result.items, 1, pageSize);
            done();
        }));
    });

    it("should return results for pagination", function (done) {
        var allItems = allItemsAccessor();
        method({pageNumber: 2, pageSize: 2}, done.wrap(function (result) {
            assert.ok(result);
            assert.equal(result.totalPages, Math.ceil(allItems.length / 2));
            assert.equal(result.pageNumber, 2);
            helper.paginateAndAssert(allItems, result.items, 2, 2);
            done();
        }));
    });

    it("should return results for no pagination", function (done) {
        var allItems = allItemsAccessor();
        method({pageNumber: 0}, done.wrap(function (result) {
            assert.ok(result);
            assert.equal(result.totalPages, 1);
            assert.equal(result.pageNumber, 0);
            helper.paginateAndAssert(allItems, result.items);
            done();
        }));
    });

    it("should return results for pagination (desc)", function (done) {
        var allItems = allItemsAccessor();
        method({pageNumber: 1, pageSize: 2, sortOrder: "Descending"}, done.wrap(function (result) {
            assert.ok(result);
            assert.equal(result.totalPages, Math.ceil(allItems.length / 2));
            assert.equal(result.pageNumber, 1);
            helper.paginateAndAssert(allItems, result.items, 1, 2, "id", "Descending");
            done();
        }));
    });
};

//create string with length 16384
var LONG_STRING = "a";
for (var i = 0; i < 14; i++) {
    LONG_STRING = LONG_STRING + LONG_STRING;
}

/**
 * Contains sample invalid value for given type.
 * Each element contains an array of invalid values.
 * Some values might not be serializable (for test log), use format {value: .., displayName:...}
 * value is a value used as an input, displayName is a name to show in the test log
 */
helper.INVALID_ARGS = {
    Object: [null, undefined, 1, true, "", "abc", []],
    ShortString: [null, undefined, 1, true, "", "  ", {}, [], {value: LONG_STRING, displayName: "LONG_STRING"}],
    ShortString_Array: [null, undefined, 1, true, "", "  ", [], [1], [null], ["abc", 1], [true], {
        value: [LONG_STRING],
        displayName: "LONG_STRING[]"
    }],
    LongString: [null, undefined, 1, true, "", "  ", {}, []],
    LongString_empty: [null, undefined, 1, true, {}, []],
    ObjectId: [null, undefined, 1, true, "", {}, [], "12345", "12345678901234567890qwer"],
    ObjectId_Array: [null, undefined, 1, true, "", {}, [], ["12345"], ["12345678901234567890qwer"], [true], [null]],
    Date: [null, undefined, 1, true, "1", {}, [], {value: new Date("abc"), displayName: 'new Date("abc")'}],
    Enum: [null, undefined, 1, true, "", "INVALID_ENUM", {}, [], {value: LONG_STRING, displayName: "LONG_STRING"}],
    PageNumber: [null, undefined, true, "", "abc", "12", {}, [], -1, 2.234],
    PageSize: [null, undefined, true, "", "abc", "12", {}, [], -1, 0, 2.234],
    IntegerId: [null, undefined, true, "", "abc", "12", {}, [], -1, 2.234],
    Integer: [null, undefined, true, "", "abc", "12", {}, [], 2.234],
    Discount: [null, undefined, true, "", "abc", "12", {}, [], -1, 2.234, 101],
    Amount: [null, undefined, true, "", "abc", "12", {}, [], -1, 0, 0.000123],
    ShortDate: [null, undefined, true, "", "abc", "12", 12, {}, [], "30-02-2000", "01-13-2000"],
    Boolean: [null, undefined, "", "abc", "12", 12, {}, []],
    Array: [null, undefined, "", "abc", "12", 12, {}],

    /**
     * Remove valid optional parameters
     * @param {Array} values the array if invalid parameters
     * @returns {Array} same array but without null and undefined values
     */
    getOptional: function (values) {
        return _.filter(values, function (v) {
            return v !== undefined;
        });
    }
};

/**
 * Reparse json object
 * @param {Object} object the object
 * @returns {*} the pure json object
 */
helper.fixJson =  function (object) {
    var ret = JSON.parse(JSON.stringify(object));
    if (ret.giftCardRedeems) {
        _.each(ret.giftCardRedeems, function (redeem) {
            if (redeem._id) {
                redeem.id = redeem._id;
                delete redeem._id;
            }
        });
    }
    return ret;
};

module.exports = helper;
