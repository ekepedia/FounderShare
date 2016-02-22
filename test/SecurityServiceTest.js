/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */
/**
 * Test units for SecurityService
 *
 * Changes in version 1.1:
 * - Update test data
 *
 * @version 1.1
 * @author TCSASSEMBLER
 */
'use strict';

var assert = require("chai").assert;
var helper = require("./testHelper");
var service = require("../src/services/SecurityService");
require("../src/common/function-utils");

describe("SecurityServiceTest", function () {
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

    describe("#authenticate", function () {
        var email = "user1@b6.com", password = "password";
        var method = service.authenticate;
        describe("[Validation]", function () {

            helper.checkInvalidArgument(function (value, done) {
                method(value, password, done);
            }, "email", helper.INVALID_ARGS.ShortString);

            helper.checkInvalidArgument(function (value, done) {
                method(email, value, done);
            }, "password", helper.INVALID_ARGS.ShortString);
        });

        describe("[Functional]", function () {
            it("should return an error if email is not found", function (done) {
		method("134567aaa@womain.com", password, helper.assertNotFoundError(done));
            });
            it("should return an error if password is incorrect", function (done) {
                method(email, "askdndoi", helper.assertValidationError(done, null, 403));
            });
            it("should authenticate", function (done) {
                method(email, password, done.wrap(function (result) {
                    assert.equal(result.email, email);
                    done();
                }));
            });
        });
    });

    describe("#generateSessionToken", function () {
        var method = service.generateSessionToken;
        describe("[Validation]", function () {

            helper.checkInvalidArgument(method, "userId", helper.INVALID_ARGS.ObjectId);
        });

        describe("[Functional]", function () {
            it("should generate token", function (done) {
                method(testData.USER1, done.wrap(function (result) {
                    assert.ok(result);
                    done();
                }));
            });
        });
    });
    describe("#generateHash", function () {
        var method = service.generateHash;
        describe("[Validation]", function () {

            helper.checkInvalidArgument(method, "plainText", helper.INVALID_ARGS.ShortString);
        });

        describe("[Functional]", function () {
            it("should generate hash", function (done) {
                method("aaa", done.wrap(function (result) {
                    assert.ok(result);
                    done();
                }));
            });
        });
    });
    describe("#authenticateWithSessionToken", function () {
        var method = service.authenticateWithSessionToken,
	    token = "user1_b6.com";
        describe("[Validation]", function () {

            helper.checkInvalidArgument(method, "token", helper.INVALID_ARGS.ShortString);
        });

        describe("[Functional]", function () {
            it("should return error if expired", function (done) {
                method("expired", helper.assertValidationError(done, "Session Token Expired", 403));
            });
            it("should return error if not found", function (done) {
                method("fkjmasdoiiadsoijmofd", helper.assertValidationError(done, "Session Token not found", 403));
            });
            it("should authenticate", function (done) {
                method(token, done.wrap(function (result, expiration) {
                    assert.ok(result);
                    assert.equal(result.id, testData.USER1);
                    assert.ok(expiration);
                    done();
                }));
            });
        });
    });
    describe("#recoverPassword", function () {
        var method = service.recoverPassword,
	    email = "user1@b6.com";
        describe("[Validation]", function () {
            helper.checkInvalidArgument(method, "email", helper.INVALID_ARGS.ShortString);
        });

        describe("[Functional]", function () {
            it("should return error if user is not found", function (done) {
                method("asdasd@domain.com", helper.assertNotFoundError(done));
            });
            it("should return token", function (done) {
                method(email, done.wrap(function (result) {
                    assert.ok(result);
                    done();
                }));
            });
        });
    });
    describe("#updateForgottenPassword", function () {
        var method = service.updateForgottenPassword,
	    password = "pass-new", token = "reset-token";
        describe("[Validation]", function () {
            helper.checkInvalidArgument(function (value, done) {
                method(value, password, done);
            }, "token", helper.INVALID_ARGS.ShortString);
            helper.checkInvalidArgument(function (value, done) {
                method(token, value, done);
            }, "password", helper.INVALID_ARGS.ShortString);
        });

        describe("[Functional]", function () {
            beforeEach(resetData);
            it("should update password", function (done) {
                method(token, password, done.wrap(function (result) {
                    assert.ok(result);
                    service.authenticate("user1@domain.com", password, done.wrap(function (result) {
                        assert.ok(result);
                        done();
                    }));
                }));
            });
            it("should return error if token is reused", function (done) {
                method(token, password, done.wrap(function () {
                    method(token, password, helper.assertValidationError(done, "Invalid or expired token"));
                }));
            });
        });
    });
    describe("#updatePassword", function () {
        var method = service.updatePassword, password = "pass-new";
        describe("[Validation]", function () {
            helper.checkInvalidArgument(function (value, done) {
                method(value, password, done);
            }, "userId", helper.INVALID_ARGS.ObjectId);
            helper.checkInvalidArgument(function (value, done) {
                method(testData.USER1, value, done);
            }, "password", helper.INVALID_ARGS.ShortString);
        });

        describe("[Functional]", function () {
            beforeEach(resetData);
            it("should update password", function (done) {
                method(testData.USER1, password, done.wrap(function () {
                    service.authenticate("user1@b6.com", password, done.wrap(function (result) {
                        assert.ok(result);
                        done();
                    }));
                }));
            });
        });
    });
    describe("#revokeSessionToken", function () {
        var method = service.revokeSessionToken, token = "user1_b6.com";
        describe("[Validation]", function () {
            helper.checkInvalidArgument(method, "token", helper.INVALID_ARGS.ShortString);
        });

        describe("[Functional]", function () {
            beforeEach(resetData);
            it("should revoke token", function (done) {
                method(token, done.wrap(function () {
                    service.authenticateWithSessionToken(token, helper.assertValidationError(done, 'Session Token not found', 403));
                }));
            });
        });
    });
});
