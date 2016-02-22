/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */
/**
 * Test units for GiftCardOfferService
 *
 * Changes in version 1.1:
 * - Update test data
 *
 * Changes in 1.2 (Project Mom and Pop - MiscUpdate5):
 * - [PMP-206] GiftCardOffer#conditions is now plain String
 *
 * @version 1.2
 * @author TCSASSEMBLER
 */
'use strict';

var assert = require("chai").assert;
var _ = require("underscore");
var helper = require("./testHelper");
var service = require("../src/services/GiftCardOfferService");
var models = require("../src/models");

describe("GiftCardOfferServiceTest", function () {
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
                allItems = testData.GiftCardOffer;
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
                businessId: testData.BUSINESS1,
                discount: 10,
                activationDateTime: new Date(),
                endDateTime: new Date(3000, 0, 1),
                description: "lorem ipsum",
                status: "DRAFT",
                totalQuantity: 1,
                conditions: "abc",
                createdBy: "createdBy",
                modifiedBy: "modifiedBy"
            };
        }

        describe("[Validation]", function () {
            helper.checkInvalidArgument(method, "giftCardOffer", helper.INVALID_ARGS.Object);
            helper.checkInvalidProperties(method, "giftCardOffer", getInputAccessor, {
                businessId: helper.INVALID_ARGS.ObjectId,
                discount: helper.INVALID_ARGS.Discount,
                activationDateTime: helper.INVALID_ARGS.Date,
                endDateTime: helper.INVALID_ARGS.Date,
                description: helper.INVALID_ARGS.ShortString,
                status: helper.INVALID_ARGS.Enum,
                totalQuantity: helper.INVALID_ARGS.Integer,
                conditions: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.LongString),
                createdBy: helper.INVALID_ARGS.ShortString,
                modifiedBy: helper.INVALID_ARGS.ShortString
            });
        });


        describe("[Functional]", function () {

            it("should return an error if businessId is not found", function (done) {
                input.businessId = helper.notFoundId;
                method(input, helper.assertNotFoundError(done));
            });

            it("should return error if expiration date is already expired", function (done) {
                input.endDateTime = new Date(2000, 0, 1);
                method(input, helper.assertValidationError(done));
            });
            it("should return error if business is not verified", function (done) {
                input.businessId = testData.BUSINESS10;
                input.status = "ACTIVE";
                method(input, helper.assertValidationError(done));
            });
            it("should create record", function (done) {
                method(input, done.wrap(function (result) {
                    input = getInputAccessor();
                    assert.ok(result);
                    assert.ok(result.id);
                    assert.ok(result.expirationDate);
                    assert.equal(result.businessId, testData.BUSINESS1);
                    assert.equal(result.availableQuantity, input.totalQuantity);
                    done();
                }));
            });
        });
    });

    describe("#getById", function () {
        var method = service.getById;
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
                    assert.deepEqual(_.omit(helper.fixJson(result), 'activationDateTime_floored', 'expirationDate_floored'), expected);
                    done();
                }));
            });
        });
    });

    describe("#update", function () {
        var input, id;
        var method = service.update;

        after(resetData);

        beforeEach(function () {
            input = getInputAccessor();
            id = testData.DRAFT_GIFT_CARD_OFFER;
        });

        /**
         * Getter for input data
         * @returns {Object} the input data
         */
        function getInputAccessor() {
            return {
                discount: 12,
                activationDateTime: new Date(),
                endDateTime: new Date(3000, 0, 1),
                description: "lorem ipsum2",
                status: "DRAFT",
                totalQuantity: 2,
                modifiedBy: "modifiedBy2"
            };
        }

        describe("[Validation]", function () {
            //call method with correct `giftCardOffer` param and incorrect `id` param
            function execIdParam(value, done) {
                method(value, input, done);
            }

            //call method with incorrect `giftCardOffer` param and correct `id` param
            function execGiftCardOfferParam(value, done) {
                method(id, value, done);
            }

            helper.checkInvalidArgument(execIdParam, "id", helper.INVALID_ARGS.ObjectId);
            helper.checkInvalidArgument(execGiftCardOfferParam, "giftCardOffer", helper.INVALID_ARGS.Object);
            helper.checkInvalidProperties(execGiftCardOfferParam, "giftCardOffer", getInputAccessor, {
                discount: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.Discount),
                activationDateTime: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.Date),
                endDateTime: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.Date),
                description: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
                status: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.Enum),
                totalQuantity: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.Integer),
                modifiedBy: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString)
            });
        });


        describe("[Functional]", function () {
            beforeEach(resetData);

            it("should return an error if id is not found", function (done) {
                method(helper.notFoundId, input, helper.assertNotFoundError(done));
            });

            it("should return error if endDateTime is past", function (done) {
                input.endDateTime = new Date(2000, 0, 1);
                method(id, input, helper.assertValidationError(done));
            });
            it("should return error if activationDateTime is older than 90 days", function (done) {
                input.activationDateTime = new Date(2000, 0, 1);
                method(id, input, helper.assertValidationError(done));
            });
            it("should return error if business.isVerified is false", function (done) {
                models.Business.findByIdAndUpdate(testData.BUSINESS1, {isVerified: false}, done.wrap(function () {
                    input.status = "ACTIVE";
                    method(id, input, helper.assertValidationError(done));
                }));
            });
            it("should return error if business.isVerificationFeePaid is false", function (done) {
                models.Business.findByIdAndUpdate(testData.BUSINESS1, {isVerificationFeePaid: false}, done.wrap(function () {
                    input.status = "ACTIVE";
                    method(id, input, helper.assertValidationError(done));
                }));
            });
            it("should return error if business.isSubscriptionExpired is true", function (done) {
                models.Business.findByIdAndUpdate(testData.BUSINESS1, {isSubscriptionExpired: true}, done.wrap(function () {
                    input.status = "ACTIVE";
                    method(id, input, helper.assertValidationError(done));
                }));
            });
            it("should return error if offer is not draft", function (done) {
                method(testData.ACTIVE_GIFT_CARD_OFFER, input, helper.assertValidationError(done));
            });
            it("should update record", function (done) {
                input.status = "ACTIVE";
                method(id, input, done.wrap(function (result) {
                    input = getInputAccessor();
                    assert.ok(result);
                    assert.ok(result.id);
                    assert.ok(result.expirationDate);
                    assert.equal(result.availableQuantity, input.totalQuantity);
                    done();
                }));
            });
        });
    });

    describe("#remove", function () {
        var method = service.remove, id;
        before(function () {
            id = testData.ACTIVE_GIFT_CARD_OFFER;
        });
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
		this.timeout(10000);
		method(id, done);
            });
        });
    });

    describe("#cancel", function () {
        var method = service.cancel, id;
        before(function () {
            id = testData.ACTIVE_GIFT_CARD_OFFER;
        });
        describe("[Validation]", function () {
            helper.checkInvalidArgument(method, "id", helper.INVALID_ARGS.ObjectId);
        });

        describe("[Functional]", function () {
            beforeEach(resetData);
            after(resetData);
            it("should return error if not found", function (done) {
                method(helper.notFoundId, helper.assertNotFoundError(done));
            });

            it("should cancel entity", function (done) {
                method(id, done.wrap(function (result) {
                    assert.equal(result.status, "CANCELLED");
                    done();
                }));
            });
        });
    });

    describe("#search", function () {
        var method = service.search;

        describe("[Validation]", function () {
            helper.checkInvalidSearchCriteria(method);
            helper.checkInvalidProperties(method, "criteria", {}, {
                businessName: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
                status: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.Enum),
                ids: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ObjectId_Array),
                businessId: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ObjectId)
            });
        });
        describe("[Functional]", function () {

            helper.verifySearchCriteria(allItemsAccessor, method);

            it("should return results filtered by businessName", function (done) {
                method({businessName: "b1"}, done.wrap(function (result) {
                    assert.lengthOf(result.items, 2);
                    _.each(result.items, function (item) {
                        assert.ok(item.businessName.indexOf("b1") >= 0);
                    });
                    done();
                }));
            });
            it("should return results filtered by status", function (done) {
                method({status: "DRAFT"}, done.wrap(function (result) {
                    assert.lengthOf(result.items, 1);
                    _.each(result.items, function (item) {
                        assert.equal(item.status, "DRAFT");
                    });
                    done();
                }));
            });
            it("should return results filtered by ids", function (done) {
                method({ids: [testData.GiftCardOffer[0].id]}, done.wrap(function (result) {
                    assert.lengthOf(result.items, 1);
                    _.each(result.items, function (item) {
                        assert.equal(item.id, testData.GiftCardOffer[0].id);
                    });
                    done();
                }));
            });
        });
    });


    describe("#purchase", function () {
        var userId, shoppingCart;
        var method = service.purchase;

        after(resetData);

        beforeEach(function () {
            userId = testData.USER1;
            shoppingCart = [{
                "paymentMethodNonce": "fake-valid-nonce",
                "giftCardOfferId": testData.ACTIVE_GIFT_CARD_OFFER,
                "quantity": 10
            }, {
                "paymentMethodNonce": "fake-valid-nonce",
                "giftCardOfferId": testData.ACTIVE_GIFT_CARD_OFFER2,
                "quantity": 20
            }];
        });


        describe("[Validation]", function () {

            //invalid userId param
            function execUserIdParam(value, done) {
                method(value, shoppingCart, done);
            }

            //invalid shoppingCart param
            function execShoppingCardParam(value, done) {
                method(userId, [value], done);
            }


            helper.checkInvalidArgument(execUserIdParam, "userId", helper.INVALID_ARGS.ObjectId);
            helper.checkInvalidArgument(function (value, done) {
                method(userId, value, done);
            }, "shoppingCart", helper.INVALID_ARGS.Array);
            helper.checkInvalidProperties(execShoppingCardParam, "shoppingCart", function () {
                return {
                    "paymentMethodNonce": "fake-valid-nonce",
                    "giftCardOfferId": testData.ACTIVE_GIFT_CARD_OFFER2,
                    "quantity": 20
                };
            }, {
                "paymentMethodNonce": helper.INVALID_ARGS.ShortString,
                "giftCardOfferId": helper.INVALID_ARGS.ObjectId,
                "quantity": helper.INVALID_ARGS.Integer
            }, true);
        });


        describe("[Functional]", function () {
            beforeEach(resetData);
            after(resetData);

            this.timeout(20000);
            it("should return error if user is not found", function (done) {
                method(helper.notFoundId, shoppingCart, helper.assertNotFoundError(done));
            });
            it("should return error if card contains duplicated items", function (done) {
                shoppingCart = shoppingCart.concat(shoppingCart);
                method(userId, shoppingCart, helper.assertValidationError(done, "Shopping card contains duplicated items"));
            });
            it("should return error if no enough quantity", function (done) {
                shoppingCart[0].quantity = 1000;
		method(userId, shoppingCart, helper.assertValidationError(done, "Not enough quantity"));
            });
            it("should return error if no enough quantity", function (done) {
                shoppingCart[0].giftCardOfferId = testData.DRAFT_GIFT_CARD_OFFER;
                method(userId, shoppingCart, helper.assertValidationError(done, "Cannot purchase non active offer"));
            });
            it("should purchase", function (done) {
                method(userId, shoppingCart, done.wrap(function (result) {
                    assert.lengthOf(result, 2);
                    done();
                }));
            });
            it("should purchase and end offer", function (done) {
                shoppingCart[0].quantity = 325;
                method(userId, shoppingCart, done.wrap(function (result) {
                    assert.lengthOf(result, 2);
                    models.GiftCardOffer.findById(testData.ACTIVE_GIFT_CARD_OFFER, done.wrap(function (offer) {
                        assert.equal(offer.status, "ENDED");
                        done();
                    }));
                }));
            });
        });
    });


    describe("#addComment", function () {
        var input;
        var method = service.addComment;

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
                giftCardOfferId: testData.ACTIVE_GIFT_CARD_OFFER,
                userId: testData.USER1,
                username: "user",
                comment: "comment"
            };
        }

        describe("[Validation]", function () {
            helper.checkInvalidArgument(method, "comment", helper.INVALID_ARGS.Object);
            helper.checkInvalidProperties(method, "comment", getInputAccessor, {
                giftCardOfferId: helper.INVALID_ARGS.ObjectId,
                userId: helper.INVALID_ARGS.ObjectId,
                username: helper.INVALID_ARGS.ShortString,
                comment: helper.INVALID_ARGS.ShortString
            });
        });


        describe("[Functional]", function () {

            it("should return an error if giftCardOfferId is not found", function (done) {
                input.giftCardOfferId = helper.notFoundId;
                method(input, helper.assertNotFoundError(done));
            });

            it("should return an error if userId is not found", function (done) {
                input.userId = helper.notFoundId;
                method(input, helper.assertNotFoundError(done));
            });
            it("should create record", function (done) {
                method(input, done.wrap(function (result) {
                    input = getInputAccessor();
                    assert.ok(result);
                    assert.ok(result.id);
                    assert.equal(result.giftCardOfferId, input.giftCardOfferId);
                    assert.equal(result.userId, input.userId);
                    assert.equal(result.username, input.username);
                    assert.equal(result.comment, input.comment);
                    done();
                }));
            });
        });
    });


    describe("#removeComment", function () {
        var method = service.removeComment,
	    id = "55dfa13330e51b8a664446dd",
	    businessId = "55d756cf39062f3557b7ca92";
        describe("[Validation]", function () {
            helper.checkInvalidArgument(function (value, done) {
                method(value, businessId, done);
            }, "id", helper.INVALID_ARGS.ObjectId);
            helper.checkInvalidArgument(function (value, done) {
                method(id, value, done);
            }, "businessId", helper.INVALID_ARGS.ObjectId);
        });

        describe("[Functional]", function () {
            beforeEach(resetData);
            after(resetData);
            it("should return error if not found", function (done) {
                method(helper.notFoundId, businessId, helper.assertNotFoundError(done));
            });
            it("should return error if invalid business", function (done) {
                method(id ,"55d756cf39062f3557b7ca91", helper.assertValidationError(done, "You are not allowed to perform this operation", 403));
            });

            it("should delete entity", function (done) {
                method(id, businessId, done);
            });
        });
    });

    describe("#getComments", function () {
        var method = service.getComments,
	    id = "55d756d039062f3557b7cb1d";
        describe("[Validation]", function () {
            helper.checkInvalidArgument(method, "id", helper.INVALID_ARGS.ObjectId);
        });

        describe("[Functional]", function () {
            beforeEach(resetData);
            after(resetData);
            it("should return error if not found", function (done) {
                method(helper.notFoundId, helper.assertNotFoundError(done));
            });

            it("should get comments", function (done) {
                method(id, done.wrap(function (result) {
                    assert.lengthOf(result, 2);
                    done();
                }));
            });
        });
    });

    describe("#getBraintreeToken", function () {
        var method = service.getBraintreeToken;

        describe("[Functional]", function () {
            it("should get token", function (done) {
                method(done.wrap(function (result) {
                    assert.ok(result);
                    done();
                }));
            });
        });
    });
});
