/*
 * Copyright (C) 2015 TopCoder Inc., All Rights Reserved.
 */
/**
 * Contains validation functions
 *
 * @version 1.2
 * @author TCSASSEMBLER
 *
 * Changes in 1.1:
 * 1. add validation types: GiftCardGiftType, AnyObject, GiftCardGiftStatus
 * Changes in 1.2:
 * 1. add "AnyObject?"
 */
"use strict";

var validator = require('rox').validator;
var emailValidator = require("email-validator");
var _ = require("underscore");
var Const = require("../Const");

/**
 * Define a global function used for validation.
 * @param {Object} input the object to validate
 * @param {Object} definition the definition object. Refer to rox module for more details.
 * @param {String} [prefix] the prefix for error message.
 * @returns {Error|Null} error if validation failed or null if validation passed.
 */
function validate(input, definition, prefix) {
    var error = validator.validate(prefix || "prefix-to-remove", input, definition);
    if (!error) {
        return null;
    }
    //remove prefix in error message
    error.message = error.message.replace("prefix-to-remove.", "");
    //if input is invalid then change the name to input
    error.message = error.message.replace("prefix-to-remove", "input");
    error.httpStatus = 400;
    return error;
}

validator.registerAlias("IntegerId", {type: "Integer", min: 1});
validator.registerAliasWithExtend("IntegerId", "IntegerId?", {required: false});

validator.registerAlias("Integer >=0", {type: "Integer", min: 0});
validator.registerAliasWithExtend("Integer >=0", "Integer? >=0", {required: false});

validator.registerAlias("Number >=0", {type: "Number", min: 0});
validator.registerAliasWithExtend("Number >=0", "Number? >=0", {required: false});

validator.registerAlias("Discount", {type: "Integer", min: 0, max: 100});
validator.registerAliasWithExtend("Discount", "Discount?", {required: false});

validator.registerAlias("ShortString", {type: "String", maxLength: 1024});
validator.registerAliasWithExtend("ShortString", "ShortString?", {required: false});

validator.registerAlias("LongString", {type: "String", maxLength: 16e3});
validator.registerAliasWithExtend("LongString", "LongString?", {required: false});

validator.registerAlias("PageSize", {type: "Integer", min: 1});
validator.registerAliasWithExtend("PageSize", "PageSize?", {required: false});

validator.registerAlias("PageNumber", {type: "Integer", min: 0});
validator.registerAliasWithExtend("PageNumber", "PageNumber?", {required: false});

validator.registerAlias("SortOrder", {type: "Enum", enum: _.values(Const.SortOrder)});
validator.registerAliasWithExtend("SortOrder", "SortOrder?", {required: false});

validator.registerAlias("bool?", {type: Boolean, required: false});
validator.registerAlias("date?", {type: Date, required: false});
validator.registerAlias("ObjectId?", {type: "ObjectId", required: false});
validator.registerAlias("email?", {type: "email", required: false});
validator.registerAlias("url?", {type: "url", required: false});
validator.registerAlias("AnyObject?", {type: "AnyObject", required: false});


//Enums
validator.registerAlias("GiftCardOfferStatus", {type: "enum", enum: _.values(Const.GiftCardOfferStatus)});
validator.registerAliasWithExtend("GiftCardOfferStatus", "GiftCardOfferStatus?", {required: false});
validator.registerAlias("GiftCardStatus", {type: "enum", enum: _.values(Const.GiftCardStatus)});
validator.registerAliasWithExtend("GiftCardStatus", "GiftCardStatus?", {required: false});
validator.registerAlias("ActionType", {type: "enum", enum: _.values(Const.ActionType)});
validator.registerAliasWithExtend("ActionType", "ActionType?", {required: false});
validator.registerAlias("SocialNetwork", {type: "enum", enum: _.values(Const.SocialNetwork)});
validator.registerAliasWithExtend("SocialNetwork", "SocialNetwork?", {required: false});
validator.registerAlias("AccountType", {type: "enum", enum: _.values(Const.AccountType)});
validator.registerAliasWithExtend("AccountType", "AccountType?", {required: false});
validator.registerAlias("UserRole", {type: "enum", enum: _.values(Const.UserRole)});
validator.registerAliasWithExtend("UserRole", "UserRole?", {required: false});
validator.registerAlias("AuthenticationType", {type: "enum", enum: _.values(Const.AuthenticationType)});
validator.registerAliasWithExtend("AuthenticationType", "AuthenticationType?", {required: false});
validator.registerAlias("GiftCardGiftType", {type: "enum", enum: _.values(Const.GiftCardGiftType)});
validator.registerAliasWithExtend("GiftCardGiftType", "GiftCardGiftType?", {required: false});
validator.registerAlias("GiftCardGiftStatus", {type: "enum", enum: _.values(Const.GiftCardGiftStatus)});
validator.registerAliasWithExtend("GiftCardGiftStatus", "GiftCardGiftStatus?", {required: false});

//MongoDB id
validator.registerType({
    name: "ObjectId",
    /**
     *
     * Validate if value is valid ObjectId
     * @param {String} name the property name
     * @param {*} value the value to check
     * @returns {Error|Null} null if value is valid or error if invalid
     */
    validate: function (name, value) {
        if (value && value.toHexString) {
            value = value.toHexString();
        }
        var notString = validator.validate(name, value, "string");
        if (notString || !/^[a-fA-F0-9]{24}$/.test(value)) {
            return new Error(name + " should be a valid ObjectId (24 hex characters)");
        }
        return null;
    }
});

//Any literal object
validator.registerType({
    name: "AnyObject",
    /**
     *
     * Validate if value is valid ObjectId
     * @param {String} name the property name
     * @param {*} value the value to check
     * @returns {Error|Null} null if value is valid or error if invalid
     */
    validate: function (name, value) {
        if (!_.isArray(value) && _.isObject(value)) {
            return null;
        }
        return new Error(name + " must be an object");
    }
});

//Date type
validator.registerType({
    name: "date",
    /**
     * Validate if value is a date type and is valid
     * @param {String} name the property name
     * @param {*} value the value to check
     * @returns {Error|Null} null if type is correct or error if incorrect
     */
    validate: function (name, value) {
        if (value instanceof Date && value.toString() !== "Invalid Date") {
            return null;
        }
        return new Error(name + " must be a valid date");
    }
});

//Email address
validator.registerType({
    name: "email",
    /**
     * Validate if value is a date type and is valid
     * @param {String} name the property name
     * @param {*} value the value to check
     * @returns {Error|Null} null if type is correct or error if incorrect
     */
    validate: function (name, value) {
        var notString = validator.validate(name, value, "string");
        if (notString) {
            return notString;
        }
        if (emailValidator.validate(value)) {
            return null;
        }
        return new Error(name + " must be a valid email address");
    }
});

//Url
validator.registerType({
    name: "url",
    /**
     * Validate if value is a date type and is valid
     * @param {String} name the property name
     * @param {*} value the value to check
     * @returns {Error|Null} null if type is correct or error if incorrect
     */
    validate: function (name, value) {
        var notString = validator.validate(name, value, "string");
        if (notString) {
            return notString;
        }
        var regex = new RegExp("^(http[s]?:\\/\\/(www\\.)?|ftp:\\/\\/(www\\.)?|www\\.){1}([0-9A-Za-z-\\.@:%_+~#=]+)+((\\.[a-zA-Z]{2,3})+)(/(.)*)?(\\?(.)*)?");

        if (regex.test(value)) {
            return null;
        }
        return new Error(name + " must be a valid url");
    }
});


module.exports = {
    validate: validate
};