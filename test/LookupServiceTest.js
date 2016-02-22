/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */
/**
 * Test units for LookupService
 *
 * @version 1.0
 * @author TCSASSEMBLER
 */
'use strict';

var assert = require("chai").assert;
var helper = require("./testHelper");
var service = require("../src/services/LookupService");
require("../src/common/function-utils");

describe("LookupServiceTest", function () {

    before(helper.resetData);

    describe("#getAllFeedbackTypes", function () {

        it("should return results", function (done) {
            service.getAllFeedbackTypes(done.wrap(function (result) {
                assert.lengthOf(result, 3);
                done();
            }));
        });
    });
    describe("#getAllBusinessTypes", function () {

        it("should return results", function (done) {
            service.getAllBusinessTypes(done.wrap(function (result) {
                assert.lengthOf(result, 3);
                done();
            }));
        });
    });
});