/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */
/**
 * Test units for BusinessService
 *
 * Changes in version 1.1:
 * - Update test data
 *
 * Changes in version 1.2 (Project Mom and Pop - MiscUpdate5):
 * - [PMP-206] Remove Business#conditions
 *
 * @version 1.2
 * @author TCSASSEMBLER
 */
'use strict';

var _ = require("underscore");
var assert = require("chai").assert;
var helper = require("./testHelper");
var service = require("../src/services/BusinessService");
var models = require("../src/models");

describe("BusinessServiceTest", function () {
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
                allItems = testData.Business;
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
                name: "name?",
                type: 1,
                streetAddress: "1737 Haight St",
		city: "San Francisco",
		state: "CA",
		country: "USA",
		zip: "94117",
                telephoneNumber: "123",
                picture: "picture",
                businessHours: "10-12",
                description: "lorem ipsum",
                website: "http://webiste.com",
                isVerified: false,
                isSubscriptionExpired: false,
                isVerificationFeePaid: false,
                braintreeAccountId: "braintree_123",
                notificationDate: new Date(2000, 1, 1)
            };
        }

        describe("[Validation]", function () {
            helper.checkInvalidArgument(method, "business", helper.INVALID_ARGS.Object);
            helper.checkInvalidProperties(method, "business", getInputAccessor, {
                name: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
                type: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.IntegerId),
                streetAddress: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
		city: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
		state: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
		country: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
		zip: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
                telephoneNumber: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
                picture: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
                businessHours: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
                description: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
                website: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
                isVerified: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.Boolean),
                isSubscriptionExpired: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.Boolean),
                isVerificationFeePaid: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.Boolean),
                braintreeAccountId: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
                notificationDate: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.Date)
            });
        });


        describe("[Functional]", function () {

            it("should return an error if type is not found", function (done) {
                input.type = 12345;
                method(input, helper.assertNotFoundError(done));
            });

            it("should return error if address is invalid", function (done) {
                method({address: "dkvmnakjdm320rjmancj"}, helper.assertValidationError(done));
            });
            it("should return error if address is ambiguous", function (done) {
                method({address: "1st street"}, helper.assertValidationError(done));
            });
            it("should create record", function (done) {
                method(input, done.wrap(function (result) {
                    input = getInputAccessor();
                    assert.ok(result);
                    assert.ok(result.id);
                    assert.equal(result.notificationDate.getTime(), input.notificationDate.getTime());
                    assert.lengthOf(result.coordinates, 2);
                    assert.ok(result.coordinates[0]);
                    assert.ok(result.coordinates[1]);
                    assert.deepEqual(_.omit(result, "id", 'notificationDate', 'coordinates', 'giftCardSeq'), _.omit(input, 'notificationDate'));
                    done();
                }));
            });
            it("should create empty record", function (done) {
                method({}, done.wrap(function (result) {
                    assert.ok(result);
                    assert.ok(result.id);
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
    describe("#getByBraintreeAccountId", function () {
        var method = service.getByBraintreeAccountId;
        var expected;
        before(function () {
            expected = allItems[0];
        });

        describe("[Validation]", function () {
            helper.checkInvalidArgument(method, "id", helper.INVALID_ARGS.ShortString);
        });
        describe("[Functional]", function () {
            it("should return error if not found", function (done) {
                method(helper.notFoundId, helper.assertNotFoundError(done));
            });
            it("should return object", function (done) {
                method(expected.braintreeAccountId, done.wrap(function (result) {
                    assert.equal(result.id, expected.id);
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
                name: "name2",
                type: 2,
                streetAddress: "1737 Haight St",
		city: "San Francisco",
		state: "CA",
		country: "USA",
		zip: "94117",
                telephoneNumber: "123",
                picture: "picture2",
                businessHours: "10-122",
                description: "lorem ipsum2",
                website: "http://webiste.com2",
                isVerified: false,
                isSubscriptionExpired: false,
                isVerificationFeePaid: false,
                braintreeAccountId: "braintree_12334",
                notificationDate: new Date(2000, 1, 1)
            };
        }

        describe("[Validation]", function () {

            //call method with correct `business` param and incorrect `id` param
            function execIdParam(value, done) {
                method(value, input, done);
            }

            //call method with incorrect `business` param and correct `id` param
            function execBusinessParam(value, done) {
                method(expected.id, value, done);
            }

            helper.checkInvalidArgument(execIdParam, "id", helper.INVALID_ARGS.ObjectId);


            helper.checkInvalidArgument(execBusinessParam, "business", helper.INVALID_ARGS.Object);
            helper.checkInvalidProperties(execBusinessParam, "business", getInputAccessor, {
                name: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
                type: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.IntegerId),
                streetAddress: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
		city: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
		state: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
		country: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
		zip: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
                telephoneNumber: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
                picture: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
                businessHours: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
                description: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
                website: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
                isVerified: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.Boolean),
                isSubscriptionExpired: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.Boolean),
                isVerificationFeePaid: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.Boolean),
                braintreeAccountId: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
                notificationDate: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.Date)
            });
        });


        describe("[Functional]", function () {
            beforeEach(resetData);

            it("should return an error if business is not found", function (done) {
                method(helper.notFoundId, input, helper.assertNotFoundError(done));
            });

            it("should return an error if type is not found", function (done) {
                input.type = 12345;
                method(expected.id, input, helper.assertNotFoundError(done));
            });

            it("should update record", function (done) {
                method(expected.id, input, done.wrap(function (result) {
                    assert.ok(result);
                    assert.ok(result.id);
                    assert.equal(result.notificationDate.getTime(), input.notificationDate.getTime());
                    assert.lengthOf(result.coordinates, 2);
                    assert.ok(result.coordinates[0]);
                    assert.ok(result.coordinates[1]);
                    assert.deepEqual(_.omit(result, "id", 'notificationDate', 'coordinates', 'giftCardSeq'), _.omit(input, 'notificationDate', 'coordinates'));
                    function assertChanges(item) {
                        assert.equal(item.businessName, input.name);
                        assert.equal(item.businessType, input.type);
                        assert.equal(item.businessAddress, input.address);
                        assert.equal(item.businessTelephone, input.telephoneNumber);
                        assert.equal(item.businessPicture, input.picture);
                    }

                    models.GiftCard.find({businessId: expected.id}, done.wrap(function (items) {
                        _.each(items, assertChanges);
                        models.GiftCardOffer.find({businessId: expected.id}, done.wrap(function (items) {
                            _.each(items, assertChanges);
                            done();
                        }));
                    }));
                }));
            });
            it("should update record (type and address not changed)", function (done) {
                delete input.type;
                delete input.streetAddress;
		delete input.city;
		delete input.state;
		delete input.country;
		delete input.zip;
                method(expected.id, input, done.wrap(function (result) {
                    assert.ok(result);
                    assert.deepEqual(_.pick(result, "id", 'type', 'coordinates'), _.pick(expected, "id", 'type', 'coordinates'));
                    done();
                }));
            });
        });
    });

    describe("#delete", function () {
        var method = service.delete;
        var id = "55d756cf39062f3557b7ca91";
        describe("[Validation]", function () {
            helper.checkInvalidArgument(method, "id", helper.INVALID_ARGS.ObjectId);
        });

        describe("[Functional]", function () {
            beforeEach(resetData);
            after(resetData);
            it("should return error if not found", function (done) {
                method(helper.notFoundId, helper.assertNotFoundError(done));
            });

            it("should return error if gift cards exist", function (done) {
                models.GiftCardOffer.remove({}, done.wrap(function () {
                    method(id, helper.assertValidationError(done, 'Business has active gift cards.'));
                }));
            });

            it("should return error if gift card offers exist", function (done) {
                models.GiftCard.remove({}, done.wrap(function () {
                    method(id, helper.assertValidationError(done, 'Business has active gift card offers.'));
                }));
            });
            it("should delete entity", function (done) {
                models.GiftCardOffer.remove({}, done.wrap(function () {
                    models.GiftCard.remove({}, done.wrap(function () {
                        method(id, done);
                    }));
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
                ids: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ObjectId_Array)
            });
        });
        describe("[Functional]", function () {

            helper.verifySearchCriteria(allItemsAccessor, method);

            it("should return results filtered by businessName", function (done) {
                method({businessName: "b1"}, done.wrap(function (result) {
                    assert.lengthOf(result.items, 2);
                    done();
                }));
            });
            it("should return results filtered by ids", function (done) {
                method({ids: [testData.Business[0].id]}, done.wrap(function (result) {
                    assert.lengthOf(result.items, 1);
                    done();
                }));
            });
        });
    });

    describe("#payForVerification", function () {
        var businessId, merchantAccountParams, paymentInfo;
        var method = service.payForVerification;

        after(resetData);

        beforeEach(function () {
            businessId = "55d756cf39062f3557b7ca8e";
            merchantAccountParams = {
                "individual": {
                    "firstName": "Jane",
                    "lastName": "Doe",
                    "email": "jane@14ladders.com",
                    "phone": "5553334444",
                    "dateOfBirth": "1981-11-19",
                    "ssn": "456-45-4567",
                    "address": {
                        "streetAddress": "111 Main St",
                        "locality": "Chicago",
                        "region": "IL",
                        "postalCode": "60622"
                    }
                },
                "business": {
                    "legalName": "Jane's Ladders",
                    "dbaName": "Jane's Ladders",
                    "taxId": "98-7654321",
                    "address": {
                        "streetAddress": "111 Main St",
                        "locality": "Chicago",
                        "region": "IL",
                        "postalCode": "60622"
                    }
                },
                "funding": {
                    "descriptor": "Blue Ladders",
                    "destination": "bank",
                    "email": "funding@blueladders.com",
                    "mobilePhone": "5555555555",
                    "accountNumber": "1123581321",
                    "routingNumber": "071101307"
                }
            };
            paymentInfo = {
                "firstName": "john",
                "lastName": "doe",
                "paymentMethodNonce": "fake-valid-nonce"
            };
        });


        describe("[Validation]", function () {

            //invalid businessId param
            function execBusinessIdParam(value, done) {
                method(value, merchantAccountParams, paymentInfo, done);
            }

            //invalid merchantAccountParams param
            function execMerchantAccountParamsParam(value, done) {
                method(businessId, value, paymentInfo, done);
            }

            //invalid paymentInfo param
            function execPaymentInfoParam(value, done) {
                method(businessId, merchantAccountParams, value, done);
            }

            helper.checkInvalidArgument(execBusinessIdParam, "id", helper.INVALID_ARGS.ObjectId);
            helper.checkInvalidArgument(execMerchantAccountParamsParam, "merchantAccountParams", helper.INVALID_ARGS.Object);
            helper.checkInvalidProperties(execPaymentInfoParam, "paymentInfo", function () {
                return {
                    "firstName": "john",
                    "lastName": "doe",
                    "paymentMethodNonce": "fake-valid-nonce"
                };
            }, {
                firstName: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
                lastName: helper.INVALID_ARGS.ShortString,
                paymentMethodNonce: helper.INVALID_ARGS.ShortString
            });
        });


        describe("[Functional]", function () {
            beforeEach(resetData);

            this.timeout(20000);
            it("should pay for verification", function (done) {
                method(businessId, merchantAccountParams, paymentInfo, done.wrap(function (result) {
                    assert.ok(result);
                    assert.ok(result.isVerificationFeePaid);
                    assert.ok(result.braintreeAccountId);
                    done();
                }));
            });
            it("should return error if already verified", function (done) {
                method('55d756cf39062f3557b7ca8c', merchantAccountParams, paymentInfo, helper.assertValidationError(done));
            });

        });
    });
});
