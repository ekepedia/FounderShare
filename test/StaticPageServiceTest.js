/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */
/**
 * Test units for StaticPageService
 *
 * Changes in version 1.1 (Project Mom and Pop - MiscUpdate5):
 * - Fix update#validation test
 *
 * @version 1.1
 * @author TCSASSEMBLER
 */
'use strict';

var _ = require("underscore");
var assert = require("chai").assert;
var helper = require("./testHelper");
var service = require("../src/services/StaticPageService");
/*var models = require("../src/models");*/

describe('StaticPageServiceTest', function() {
    var testData, allItems;

    /**
     * Reset test data
     * @param {Function} done the callback
     */
    function resetData(done) {
        helper.resetData(function (err, result) {
            if (err) {
                done(err);
            } else {
                testData = result;
                allItems = testData.StaticPage;
                done();
            }
        });
    }

    before(resetData);

    /**
     * Getter for all items
     * @returns {Array} the all items
     */
    function allItemsAccessor() {
        return allItems;
    }

    describe("#create", function () {
        var input;
        var method = service.create;

        after(resetData);

        beforeEach(function () {
            input = getInputAccessor();
        });

        /**
         * Getter for input data
         * @returns {Object} the input data
         */
        function getInputAccessor() {
            return {
                name: "name",
                content: "content?"
            };
        }

	describe("[Validation]", function () {
            helper.checkInvalidArgument(method, "page", helper.INVALID_ARGS.Object);
            helper.checkInvalidProperties(method, "page", getInputAccessor, {
                name: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
                content: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.LongString)
            });
        });


        describe("[Functional]", function () {

            it("should return an error if name already exists", function (done) {
                input.name = 'terms';
                method(input, function(err/*, page*/) {
		    assert.ok(err);
		    done();
		});
            });
	    it("should create record", function (done) {
                method(input, done.wrap(function (result) {
                    input = getInputAccessor();
                    assert.ok(result);
                    assert.ok(result.id);
                    assert.deepEqual(_.omit(result, "id"), input);
                    done();
                }));
            });
        });
    });

    describe("#get", function () {
        var method = service.get;
        var expected;
        before(function () {
            expected = allItems[0];
        });

        describe("[Validation]", function () {
            helper.checkInvalidArgument(method, "id", helper.INVALID_ARGS.ObjectId);
        });
        describe("[Functional]", function () {
            it("should return null if not found", function (done) {
                method(helper.notFoundId, done.wrap(function (result) {
                    assert.notOk(result);
                    done();
                }));
            });
            it("should return object", function (done) {
                method(expected.id, done.wrap(function (result) {
                    assert.deepEqual(result, expected);
                    done();
                }));
            });
        });
    });

    describe("#getByName", function () {
        var method = service.getByName;
        var expected;
        before(function () {
            expected = allItems[0];
        });

        describe("[Validation]", function () {
            helper.checkInvalidArgument(method, "name", helper.INVALID_ARGS.ShortString);
        });
        describe("[Functional]", function () {
            it("should return null if not found", function (done) {
                method("invalid_page_name", done.wrap(function (result) {
                    assert.notOk(result);
                    done();
                }));
            });
            it("should return object", function (done) {
                method(expected.name, done.wrap(function (result) {
                    assert.deepEqual(result, expected);
                    done();
                }));
            });
        });
    });

    describe("#update", function () {
        var input, expected;
        var method = service.update;

        after(resetData);

        beforeEach(function () {
            expected = allItems[0];
            input = getInputAccessor();
        });

	/**
         * Getter for input data
         * @returns {Object} the input data
         */
        function getInputAccessor() {
            return {
                name: "name",
                content: "content?"
            };
        }

	describe("[Validation]", function () {
	    //call method with correct `business` param and incorrect `id` param
            function execIdParam(value, done) {
                method(value, input, done);
            }

            //call method with incorrect `page` param and correct `id` param
            function execPageParam(value, done) {
                method(expected.id, value, done);
            }

	    helper.checkInvalidArgument(execIdParam, "id", helper.INVALID_ARGS.ObjectId);

            helper.checkInvalidArgument(execPageParam, "page", helper.INVALID_ARGS.Object);
            helper.checkInvalidProperties(execPageParam, "page", getInputAccessor, {
                name: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
                content: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.LongString_empty)
            });
        });

	describe("[Functional]", function () {
            beforeEach(resetData);

            it("should return an error if business is not found", function (done) {
                method(helper.notFoundId, input, helper.assertNotFoundError(done));
            });
	    it("should update record", function (done) {
                method(expected.id, input, done.wrap(function (result) {
                    assert.ok(result);
                    assert.ok(result.id);
                    assert.deepEqual(_.omit(result, "id"), input);
                    done();
                }));
            });
	});
    });

    describe("#delete", function () {
        var method = service.delete;
        var id = "55d756d939062f3557b7ce10";
        describe("[Validation]", function () {
            helper.checkInvalidArgument(method, "id", helper.INVALID_ARGS.ObjectId);
        });

        describe("[Functional]", function () {
            beforeEach(resetData);
            after(resetData);
            it("should return error if not found", function (done) {
                method(helper.notFoundId, helper.assertNotFoundError(done));
            });
            it("should delete entity", function (done) {
                method(id, done);
            });
        });
    });

    describe("#search", function () {
        var method = service.search;

        describe("[Validation]", function () {
            helper.checkInvalidSearchCriteria(method);
            helper.checkInvalidProperties(method, "criteria", {}, {
                pageName: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
                ids: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ObjectId_Array)
            });
        });
        describe("[Functional]", function () {

            helper.verifySearchCriteria(allItemsAccessor, method);

            it("should return results filtered by name", function (done) {
                method({pageName: "faq"}, done.wrap(function (result) {
                    assert.lengthOf(result.items, 1);
                    done();
                }));
            });
            it("should return results filtered by ids", function (done) {
                method({ids: [testData.StaticPage[0].id]}, done.wrap(function (result) {
                    assert.lengthOf(result.items, 1);
                    done();
                }));
            });
        });
    });
});
