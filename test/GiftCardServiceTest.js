/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */
/**
 * Test units for GiftCardService
 *
 * Changes in version 1.1:
 * - Update test data
 *
 * @version 1.1
 * @author TCSASSEMBLER
 */
'use strict';

var assert = require("chai").assert;
var _ = require("underscore");
var helper = require("./testHelper");
var service = require("../src/services/GiftCardService");
var models = require("../src/models");

describe("GiftCardServiceTest", function () {
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
                allItems = testData.GiftCard;
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

    describe("#getByQRCode", function () {
        var qrCode = "3nI9jILp30MEPO1ER9au",
	    businessId = "55d756cf39062f3557b7ca91";
        var method = service.getByQRCode;

        describe("[Validation]", function () {

            helper.checkInvalidArgument(function (value, done) {
                method(value, businessId, done);
            }, "qrCode", helper.INVALID_ARGS.ShortString);

            helper.checkInvalidArgument(function (value, done) {
                method(qrCode, value, done);
            }, "businessId", helper.INVALID_ARGS.ObjectId);
        });


        describe("[Functional]", function () {
            after(resetData);

            it("should return an error if qr code is not found", function (done) {
                method("aaa", businessId, helper.assertNotFoundError(done));
            });

            it("should return error if businessId doesn't own this qr code", function (done) {
                method("4L1gWle50L4QkBFITfYO", businessId, helper.assertValidationError(done, "QR Code doesn't belong to your business.", 403));
            });
            it("should return a gift card", function (done) {
                method(qrCode, businessId, done.wrap(function (result) {
                    assert.equal(result.currentQRCode, qrCode);
                    done();
                }));
            });
	    it("should return a gift card when querying an oldQRCode", function (done) {
		models.GiftCard.update({currentQRCode: qrCode}, {oldQRCode: "zOIUZsd23d92pwbU8Dl2"}, {}, done.wrap(function() {
		    method("zOIUZsd23d92pwbU8Dl2", businessId, done.wrap(function(result) {
			assert.equal(result.oldQRCode, "zOIUZsd23d92pwbU8Dl2");
			done();
		    }));
		}));
	    });
            it("should return error if gift card is not active", function (done) {
                models.GiftCard.update({}, {status: "INACTIVE"}, {multi: true}, done.wrap(function () {
                    method(qrCode, businessId, helper.assertValidationError(done, "Gift card is not active."));
                }));
            });
        });
    });

    describe("#redeem", function () {
        var qrCode = "3nI9jILp30MEPO1ER9au",
	    businessId = "55d756cf39062f3557b7ca91",
	    amount = 10, fullAmount = 40;
        var method = service.redeem;

        describe("[Validation]", function () {

            helper.checkInvalidArgument(function (value, done) {
                method(value, amount, businessId, done);
            }, "qrCode", helper.INVALID_ARGS.ShortString);

            helper.checkInvalidArgument(function (value, done) {
                method(qrCode, value, businessId, done);
            }, "amount", helper.INVALID_ARGS.Amount);

            helper.checkInvalidArgument(function (value, done) {
                method(qrCode, amount, value, done);
            }, "businessId", helper.INVALID_ARGS.ObjectId);
        });


        describe("[Functional]", function () {
            after(resetData);
            beforeEach(resetData);

            it("should return error if quantity is not enough", function (done) {
                method(qrCode, 10000, businessId, helper.assertValidationError(done, "Gift card quantity is not enough."));
            });
            it("should redeem a gift card", function (done) {
                method(qrCode, amount, businessId, done.wrap(function (result) {
                    assert.equal(result.quantity, fullAmount - amount);
                    assert.lengthOf(result.giftCardRedeems, 2);
                    assert.equal(result.giftCardRedeems[1].amount, amount);
                    models.GiftCardOffer.findById("55d756d039062f3557b7cb14", done.wrap(function (offer) {
                        assert.equal(offer.redeemedQuantity, 94 + amount);
                        done();
                    }));
                }));
            });
            it("should redeem a gift card (full amount", function (done) {
                method(qrCode, fullAmount, businessId, done.wrap(function (result) {
                    assert.equal(result.quantity, 0);
                    assert.equal(result.status, "INACTIVE");
                    assert.lengthOf(result.giftCardRedeems, 2);
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
                status: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.Enum),
                ownerId: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ObjectId)
            });
        });
        describe("[Functional]", function () {

            helper.verifySearchCriteria(allItemsAccessor, method);

            it("should return results filtered by status", function (done) {
                method({status: "ACTIVE"}, done.wrap(function (result) {
                    assert.lengthOf(result.items, 3);
                    _.each(result.items, function (item) {
                        assert.equal(item.status, "ACTIVE");
                    });
                    done();
                }));
            });
            it("should return results filtered by ownerId", function (done) {
                method({ownerId: testData.USER1}, done.wrap(function (result) {
                    assert.lengthOf(result.items, 1);
                    _.each(result.items, function (item) {
                        assert.equal(item.ownerId, testData.USER1);
                    });
                    done();
                }));
            });
        });
    });


    describe("#get", function () {
        var method = service.get;
        var expected;
        before(function (done) {
	    resetData(done);
	    expected = allItems[0];
        });
	after(resetData);
        beforeEach(resetData);

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
                    assert.deepEqual(helper.fixJson(_.omit(result, 'giftCardRedeems')), helper.fixJson(_.omit(expected, 'giftCardRedeems')));
                    done();
                }));
            });
        });
    });
});
