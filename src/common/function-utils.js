/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */

/**
 * Represents the utils that extend prototype of any function
 * @author TCSASSEMBLER
 * @version 1.0
 *
 */
"use strict";

/**
 * Creates a function which calls the original function only with an error object.
 * Sample usage:
 *
 * myMethod("foo", "bar", callback.errorOnly())
 *
 * The extra callback parameters will be ignored.
 *
 * @param {Object} [context] the "this" context
 * @returns {Function} the delegated function
 */
Function.prototype.errorOnly = function (context) {
    var self = this;
    return function (err) {
        self.call(context, err);
    };
};

/**
 * Creates a function which wraps a given function and checks for an error object.
 * If an error occurs the original function will be called, otherwise given function will be executed,
 * but without an error object.
 * Sample usage:
 *
 * myMethod("foo", "bar", callback.wrap(function (result1, result2) {
 *
 * }))
 *
 *
 * @param {Function} fn the function to wrap
 * @param {Object} [context] the "this" context
 * @returns {Function} the delegated function
 */
Function.prototype.wrap = function (fn, context) {
    var self = this;
    return function (err) {
        if (err) {
            self(err);
        } else {
            var args = Array.prototype.slice.call(arguments);
            if (args.length) {
                // remove error (null) from arguments
                args.shift();
            }
            fn.apply(context, args);
        }
    };
};
