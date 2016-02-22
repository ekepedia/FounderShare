/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */
/**
 * Test units for ActionRecordService
 *
 * Changes in version 1.1:
 * - Update test data
 *
 * Changes in version 1.2 (Project Mom and Pop - Release Fall 2015 Assembly):
 * - [PMP-233] Add amount
 * - [PMP-233] Add giftCardId
 * - [PMP-233] Add giftCardOfferId
 * - [PMP-233] Add target
 *
 * @version 1.2
 * @author TCSASSEMBLER
 */
'use strict';

var _ = require("underscore");
var assert = require("chai").assert;
var helper = require("./testHelper");
var service = require("../src/services/ActionRecordService");

describe("ActionRecordServiceTest", function () {
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
                allItems = testData.ActionRecord;
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
                userId: testData.User[0].id,
                businessId: testData.Business[0].id,
                timestamp: new Date(),
		businessName: testData.Business[0].name,
                type: "PURCHASE",
                amount: "text"
            };
        }

        describe("[Validation]", function () {
            helper.checkInvalidArgument(method, "actionRecord", helper.INVALID_ARGS.Object);
            helper.checkInvalidProperties(method, "actionRecord", getInputAccessor, {
                userId: helper.INVALID_ARGS.ObjectId,
                businessId: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ObjectId),
                timestamp: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.Date),
		businessName: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
                type: helper.INVALID_ARGS.Enum,
		details: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
                amount: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
		giftCardId: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ObjectId),
		giftCardOfferId: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ObjectId),
		target: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
            });
        });

        describe("[Functional]", function () {
            it("should return an error if userId is not found", function (done) {
                input.userId = helper.notFoundId;
                method(input, helper.assertNotFoundError(done));
            });
            it("should return an error if businessId is not found", function (done) {
                input.userId = helper.notFoundId;
                method(input, helper.assertNotFoundError(done));
            });
            it("should create record", function (done) {
                method(input, done.wrap(function (result) {
                    assert.ok(result);
                    assert.ok(result.id);
                    assert.equal(result.userId, input.userId);
                    assert.equal(result.businessId, input.businessId);
                    assert.equal(result.timestamp.getTime(), input.timestamp.getTime());
                    assert.equal(result.type, input.type);
                    assert.equal(result.amount, input.amount);
                    done();
                }));
            });
        });
    });

    describe("#search", function () {
        var input;
        var method = service.search;

        beforeEach(function () {
            input = {
                userId: testData.User[0].id,
                businessId: testData.Business[0].id,
                startDate: new Date(1, 0, 2000),
                endDate: new Date(1, 0, 3000),
                type: "PURCHASE"
            };
        });
        describe("[Validation]", function () {
            helper.checkInvalidSearchCriteria(method);
            helper.checkInvalidProperties(method, "criteria", {}, {
                type: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.Enum),
                userId: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ObjectId),
                businessId: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ObjectId)
            });
        });
        describe("[Functional]", function () {

            helper.verifySearchCriteria(allItemsAccessor, method);

            it("should return results filtered by type", function (done) {
                method({type: "PURCHASE"}, done.wrap(function (result) {
                    assert.lengthOf(result.items, 3);
                    _.each(result.items, function (item) {
                        assert.equal(item.type, "PURCHASE");
                    });
                    done();
                }));
            });
            it("should return results filtered by userId", function (done) {
                method({userId: testData.USER1}, done.wrap(function (result) {
                    assert.lengthOf(result.items, 1);
                    _.each(result.items, function (item) {
                        assert.equal(item.userId, testData.USER1);
                    });
                    done();
                }));
            });
            it("should return results filtered by businessId", function (done) {
                method({businessId: testData.BUSINESS1}, done.wrap(function (result) {
                    assert.lengthOf(result.items, 2);
                    _.each(result.items, function (item) {
                        assert.equal(item.businessId, testData.BUSINESS1);
                    });
                    done();
                }));
            });
        });
    });

    describe("#setRatings", function () {
        var input;
        var method = service.setRatings;

        beforeEach(function () {
            input = {
                userId: "55d756d039062f3557b7caa3",
		giftCardId: "55d756d739062f3557b7ccb6",
                type: "PURCHASE",
		ratings: [2, 1, 3]
            };
        });
        describe("[Functional]", function () {
            it("should set ratings", function (done) {
                method(input, done);
            });
	});
    });

});
