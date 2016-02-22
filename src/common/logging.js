/*
 * Copyright (C) 2015 TopCoder Inc., All Rights Reserved.
 */
/**
 * Helper method to perform logging
 *
 * @version 1.1
 * @author TCSASSEMBLER
 *
 * Changes in version 1.1:
 * - Fix [PMP-166] Remove field resetLink
 * - Include timestamps in logs
 */
"use strict";

var winston = require('winston');
var _ = require('underscore');


var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      timestamp: function() {
          return (new Date().toISOString());
      }
    })
  ]
});

/**
 * Log error
 * @param {String} signature the signature to log
 * @param {Object} error
 */
function logError(signature, error) {
    var objToLog;
    if (error instanceof Error) {
        //stack contains error message
        objToLog = {error: JSON.stringify(error), stack: error.stack};
    } else {
        objToLog = JSON.stringify(error);
    }
    logger.error(signature, objToLog);
}

/**
 * Combine two arrays into object
 * @param {Array} names the arrays of names/keys
 * @param {Array} values the array of values
 * @returns {Object} the combined object
 * @private
 */
function _combineNames(names, values) {
    var index, counter = 1;
    var ret = {};
    var val;
    for (index = 0; index < names.length; index++) {
        val = values[index];
        if (val === undefined) {
            val = "<undefined>";
        }
        ret[names[index]] = val;
    }
    while (index < values.length) {
        ret["<undefined " + counter + ">"] = values[index++];
        counter++;
    }
    return JSON.parse(JSON.stringify(ret, function (name, value) {
        var removeFields = ['accessToken', 'password', "passwordHash", "resetPasswordToken", "sessionToken", "token", "paymentMethodNonce", "resetLink"];
        if (_.contains(removeFields, name)) {
            return "<removed>";
        }
        if (_.isArray(value) && value.length > 100) {
            return "Array(" + value.length + ")";
        }
        return value;
    }));
}

/**
 * Create logging wrapper.
 * All required parameters must be passed to wrapped function and last parameter must be function otherwise
 * error will be thrown.
 * @param {Function} fn the function to wrap
 * @param {Object} options the options
 * @param {Array} options.input the names of input parameters
 * @param {Array} options.output the names of output parameters
 * @param {String} options.signature the signature of method
 * @param {Boolean} [options.logOutput=true] the flag if log the output result
 * @param {Boolean} [options.logInput=true] the flag if log the input arguments
 * @returns {Function} the wrapped function
 * @throws {Error} if input parameters are invalid
 */
function createWrapper(fn, options) {
    if (!_.isFunction(fn)) {
        throw new Error("fn should be a function");
    }
    if (!_.isArray(options.input)) {
        throw new Error("options.input should be an object");
    }
    if (!_.isArray(options.output)) {
        throw new Error("options.output should be an object");
    }
    if (!_.isString(options.signature)) {
        throw new Error("options.signature should be a string");
    }

    var input = options.input,
        output = options.output,
        signature = options.signature;
    return function () {
        var paramCount = input.length,
            callbackParamCount = output.length,
            callback = arguments[arguments.length - 1],
            delegatedCallback,
            start = new Date().getTime();
        if (arguments.length !== paramCount + 1) {
            throw new Error(signature + " expects at least " +
            paramCount + " parameters and a callback.");
        }
        if (!_.isFunction(callback)) {
            throw new Error("callback argument must be a function.");
        }

        var inputParams = _combineNames(input, arguments);
        if (options.logInput === false) {
            inputParams = "<removed>";
        }
        logger.info("ENTER %s %j", signature, {input: inputParams}, {});
        /**
         * Replace the callback with a log and cache supporting version
         */
        delegatedCallback = function () {
            var cbArgs = arguments;
            var wrappedError;
            //if returned error, wrap this error and log to console
            if (cbArgs[0]) {
                var error = cbArgs[0];
                logger.error("%s %j\n", signature, {input: inputParams}, error.stack || JSON.stringify(error));
                callback(error);
            } else {
                var callbackArgumentsOk = true;
                //check callback parameters existence
                if (cbArgs.length !== callbackParamCount + 1) {
                    //if callback has only callback parameters, we dont have to pass 'null' value
                    //we can call 'callback()' instead of 'callback(null)'
                    callbackArgumentsOk = cbArgs.length === 1 && callbackParamCount === 0;
                }
                if (cbArgs.length === callbackParamCount && callbackParamCount === 0) {
                    callbackArgumentsOk = true;
                }
                var outputParams = _combineNames(output, Array.prototype.slice.call(cbArgs, 1));
                if (options.logOutput === false) {
                    outputParams = "<removed>";
                }
                if (callbackArgumentsOk) {
                    var diff = new Date().getTime() - start;
                    logger.info("EXIT %s %j", signature, {
                        input: inputParams,
                        output: outputParams,
                        time: diff + "ms"
                    }, {});
                    callback.apply(this, cbArgs);
                } else {
                    if (callbackParamCount > cbArgs.length - 1) {
                        var missingParams = output.slice(cbArgs.length - 1);
                        wrappedError = new Error("Missing callback parameter(s): " + missingParams.join(", "));
                    } else {
                        wrappedError = new Error("Too many callback parameters");
                    }
                    logger.error("%s %j\n", signature, {input: inputParams, output: outputParams}, wrappedError.stack);
                    callback(wrappedError);
                }
            }
        };
        var args = arguments;
        args[args.length - 1] = delegatedCallback;
        try {
            fn.apply(this, args);
        } catch (e) { // catch errors within the method body
            delegatedCallback.call(this, e);
        }
    };
}

/**
 * The middleware for error handling
 * @param {Error} err the occurred error
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function errorHandler(err, req, res, next) {//jshint ignore:line
    logError(req.signature, err);
    res.status(err.httpStatus || 500).json({
	error: err.message,
        fullError: err
    });
}

module.exports = {
    logError: logError,
    errorHandler: errorHandler,
    createWrapper: createWrapper,
    logger: logger
};
