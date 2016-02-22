/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */
/**
 * Test units for UserService
 *
 * Changes in version 1.1:
 * - Update test data
 *
 * @version 1.1
 * @author TCSASSEMBLER
 */
'use strict';

var _ = require("underscore");
var assert = require("chai").assert;
var helper = require("./testHelper");
var service = require("../src/services/UserService");
var models = require("../src/models");

describe("UserServiceTest", function () {
    var testData;

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
                done();
            }
        });
    }

    before(resetData);


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
                firstName: "name",
                lastName: "last nme",
                email: "mail@domain.com",
                location: "aaa",
                picture: "http://image.jpg",
                password: "pass",
                userRoles: [{role: "INDIVIDUAL_USER"}],
                linkedSocialNetwork: "FACEBOOK",
                linkedSocialNetworkUserId: "123",
                isFirstNamePublic: true,
                isLastNamePublic: true,
                isEmailPublic: true,
                isLocationPublic: true,
                isPicturePublic: true
            };
        }

        describe("[Validation]", function () {
            helper.checkInvalidArgument(method, "user", helper.INVALID_ARGS.Object);
            helper.checkInvalidProperties(method, "user", getInputAccessor, {
                name: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
                lastName: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
                email: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
                location: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
                picture: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
                password: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
                userRoles: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.Array),
                linkedSocialNetwork: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
                linkedSocialNetworkUserId: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
                isFirstNamePublic: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.Boolean),
                isLastNamePublic: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.Boolean),
                isEmailPublic: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.Boolean),
                isLocationPublic: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.Boolean),
                isPicturePublic: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.Boolean)
            });
        });


        describe("[Functional]", function () {

            it("should return an error if email is registered", function (done) {
                input.email = "user1@domain.com";
                method(input, helper.assertValidationError(done));
            });
            it("should create record", function (done) {
                method(input, done.wrap(function (result) {
                    input = getInputAccessor();
                    assert.ok(result);
                    assert.ok(result.id);
                    var resultFiltered = _.pick(result, "firstName", 'lastName', 'email', 'location', 'picture',
                            'linkedSocialNetwork', 'linkedSocialNetworkUserId', 'isFirstNamePublic',
                        'isLastNamePublic', 'isEmailPublic', 'isLocationPublic', 'isPicturePublic');
                    assert.deepEqual(resultFiltered, _.omit(input, 'password', 'userRoles'));
                    done();
                }));
            });
            it("should create without password and email", function (done) {
                delete input.password;
                delete input.email;
                method(input, done.wrap(function (result) {
                    assert.ok(result);
                    assert.ok(result.id);
                    done();
                }));
            });
        });
    });

    describe("#update", function () {
        var input;
        var method = service.update;

        after(resetData);

        beforeEach(function (done) {
	    resetData(done);
            input = getInputAccessor();
        });

        /**
         * Getter for input data
         * @returns {Object} the input data
         */
        function getInputAccessor() {
            return {
                firstName: "name",
                lastName: "last nme",
                email: "mail@domain.com",
                location: "aaa",
                picture: "http://image.jpg",
                password: "pass",
                userRoles: [{role: "INDIVIDUAL_USER"}],
                linkedSocialNetwork: "FACEBOOK",
                linkedSocialNetworkUserId: "123",
                isFirstNamePublic: true,
                isLastNamePublic: true,
                isEmailPublic: true,
                isLocationPublic: true,
                isPicturePublic: true
            };
        }

        describe("[Validation]", function () {
            helper.checkInvalidArgument(function (value, done) {
                method(value, input, done);
            }, "userId", helper.INVALID_ARGS.ObjectId);

            helper.checkInvalidArgument(function (value, done) {
                method(testData.USER1, value, done);
            }, "user", helper.INVALID_ARGS.Object);

            helper.checkInvalidProperties(function (value, done) {
                method(testData.USER1, value, done);
            }, "user", getInputAccessor, {
                name: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
                lastName: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
                email: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
                location: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
                picture: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
                password: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
                userRoles: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.Array),
                linkedSocialNetwork: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
                linkedSocialNetworkUserId: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.ShortString),
                isFirstNamePublic: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.Boolean),
                isLastNamePublic: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.Boolean),
                isEmailPublic: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.Boolean),
                isLocationPublic: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.Boolean),
                isPicturePublic: helper.INVALID_ARGS.getOptional(helper.INVALID_ARGS.Boolean)
            });
        });


        describe("[Functional]", function () {

            it("should return an error if email is registered", function (done) {
                input.email = "user1@domain.com";
                method(testData.USER1, input, helper.assertValidationError(done));
            });
            it("should update record", function (done) {
                method(testData.USER1, input, done.wrap(function (result) {
                    input = getInputAccessor();
                    assert.ok(result);
                    assert.ok(result.id);
                    var resultFiltered = _.pick(result, "firstName", 'lastName', 'email', 'location', 'picture',
                            'linkedSocialNetwork', 'linkedSocialNetworkUserId', 'isFirstNamePublic',
                        'isLastNamePublic', 'isEmailPublic', 'isLocationPublic', 'isPicturePublic');
                    assert.deepEqual(resultFiltered, _.omit(input, 'password', 'userRoles'));
                    done();
                }));
            });
            it("should update without password and email", function (done) {
                delete input.password;
                delete input.email;
                method(testData.USER1, input, done.wrap(function (result) {
                    assert.ok(result);
                    assert.ok(result.id);
                    done();
                }));
            });
        });
    });


    describe("#remove", function () {
        var method = service.remove;
        describe("[Validation]", function () {
            helper.checkInvalidArgument(method, "userId", helper.INVALID_ARGS.ObjectId);
        });

        describe("[Functional]", function () {
            after(resetData);

            it("should return error if user is not found", function (done) {
                method(helper.notFoundId, helper.assertNotFoundError(done));
            });
            it("should remove user", function (done) {
                method(testData.USER1, done.wrap(function () {
                    models.User.findById(testData.USER1, done.wrap(function (result) {
                        assert.notOk(result);
                        done();
                    }));
                }));
            });
        });
    });

    describe("#get", function () {
        var method = service.get;
        describe("[Validation]", function () {
            helper.checkInvalidArgument(method, "userId", helper.INVALID_ARGS.ObjectId);
        });

        describe("[Functional]", function () {

            it("should return null if user is not found", function (done) {
                method(helper.notFoundId, done.wrap(function (result) {
                    assert.notOk(result);
                    done();
                }));
            });
            it("should get user", function (done) {
                method(testData.USER1, done.wrap(function (result) {
                    assert.ok(result);
                    assert.equal(result.id, testData.USER1);
                    done();
                }));
            });
        });
    });

    describe("#getByEmail", function () {
        var method = service.getByEmail, email = "user1@domain.com";
        describe("[Validation]", function () {
            helper.checkInvalidArgument(method, "email", helper.INVALID_ARGS.ShortString);
        });

        describe("[Functional]", function () {
            it("should return null if user is not found", function (done) {
                method("asdasd@domain.com", done.wrap(function (result) {
                    assert.notOk(result);
                    done();
                }));
            });
            it("should return user", function (done) {
                method(email, done.wrap(function (result) {
                    assert.ok(result);
                    assert.equal(result.email_lowered, email.toLowerCase());
                    done();
                }));
            });
        });
    });
    describe("#getBySocialNetwork", function () {
        var method = service.getBySocialNetwork, socialNetwork = "FACEBOOK", linkedSocialNetworkUserId = "123456789";
        describe("[Validation]", function () {
            helper.checkInvalidArgument(function (value, done) {
                method(value, linkedSocialNetworkUserId, done);
            }, "socialNetwork", helper.INVALID_ARGS.ShortString);

            helper.checkInvalidArgument(function (value, done) {
                method(socialNetwork, value, done);
            }, "linkedSocialNetworkUserId", helper.INVALID_ARGS.ShortString);
        });

        describe("[Functional]", function () {
            it("should return null if user is not found", function (done) {
                method(socialNetwork, "fikmasjnodno", done.wrap(function (result) {
                    assert.notOk(result);
                    done();
                }));
            });
            it("should return user", function (done) {
                method(socialNetwork, linkedSocialNetworkUserId, done.wrap(function (result) {
                    assert.ok(result);
                    assert.equal(result.id, testData.USER1);
                    done();
                }));
            });
        });
    });

    describe("#getEmployees", function () {
        var method = service.getEmployees;
        describe("[Validation]", function () {
            helper.checkInvalidArgument(method, "businessId", helper.INVALID_ARGS.ObjectId);
        });

        describe("[Functional]", function () {
            it("should return users", function (done) {
                method(testData.BUSINESS1, done.wrap(function (results) {
                    assert.lengthOf(results, 1);
                    done();
                }));
            });
        });
    });
});
