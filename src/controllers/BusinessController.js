/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */

/**
 * This controller exposes REST actions for business.
 *
 * Changes in version 1.1:
 *  - Updated the business address logic.
 *  - Added getAllBusinessActions() method.
 *
 *  Changes in version 1.2:
 *  - Populate first name and last name in getMyBusinessActions
 *
 *  Changes in version 1.3:
 *  - Code style changes
 *
 * @author TCSASSEMBLER
 * @version 1.3
 */
'use strict';

var _ = require("underscore");
var async = require("async");
var helper = require("../common/helper");
var Const = require("../Const");
var validate = require("../common/validator").validate;
var awsHelper = require("../common/awsHelper");
var ForbiddenError = require("../common/errors").ForbiddenError;
var NotFoundError = require("../common/errors").NotFoundError;
var BusinessService = require("../services/BusinessService");
var UserService = require("../services/UserService");
var ActionRecordService = require("../services/ActionRecordService");

/**
 * Get business or return error if not found
 * @param {ObjectId} businessId the business id
 * @param {function(Error)} callback the callback function with arguments
 * - the error
 * @private
 */
function _getBusiness(businessId, callback) {
    BusinessService.get(businessId, callback.wrap(function (result) {
        if (!result) {
            return callback(new NotFoundError("Business not found"));
        }
        callback(null, result);
    }));
}

/**
 * Middleware to check if current user has permission to employee
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function _checkEmployeePermission(req, res, next) {
    async.waterfall([
        function (cb) {
            UserService.get(req.params.id, cb);
        }, function (existing, cb) {
            if (!existing) {
                return cb(new NotFoundError("Employee not found"));
            }
            var sameBusiness = _.any(existing.userRoles, function (userRole) {
                return _.compareObjectId(userRole.businessId, req.user.businessId) &&
                    userRole.role === Const.UserRole.BUSINESS_EMPLOYEE;
            });
            if (!sameBusiness) {
                return next(new ForbiddenError("You don't have permission to update that user"));
            }
            req.employee = existing;
            next();
        }
    ], next);
}

/**
 * Get business of current user
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function getMyBusinessProfile(req, res, next) {
    _getBusiness(req.user.businessId, next.wrap(function (result) {
        res.json(result);
    }));
}

/**
 * Get business of current user
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function searchBusinesses(req, res, next) {
    helper.fixQueryStringForSearchCriteria(req.query);
    BusinessService.search(req.query, next.wrap(function (result) {
        res.json(result);
    }));
}

/**
 * Update business of current user
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function updateMyBusinessProfile(req, res, next) {
    var values = req.body;
    var business;
    async.waterfall([
        function (cb) {
            _getBusiness(req.user.businessId, cb);
        }, function (result, cb) {
            business = result;
            if (business.isVerified) {
                delete values.name;
                delete values.streetAddress;
                delete values.city;
                delete values.state;
                delete values.country;
                delete values.zip;
            }
            values = _.pick(values, 'name', 'type', 'streetAddress', 'city', 'state', 'country', 'zip',
                'telephoneNumber', 'businessHours', 'description', 'website');
            if (values.hasOwnProperty('type')) {
                values.type = Number(values.type);
            }
            if (req.files && req.files.image) {
                awsHelper.uploadPhotoToS3(req.files.image, cb.wrap(function (url) {
                    values.picture = url;
                    cb();
                }));
            } else {
                cb();
            }
        }, function (cb) {
            BusinessService.update(business.id, values, cb);
        }, function (result) {
            res.json(result);
        }
    ], next);
}

/**
 * Get business
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function getBusinessProfile(req, res, next) {
    _getBusiness(req.params.id, next.wrap(function (result) {
        res.json(result);
    }));
}

/**
 * Get business employees of current user
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function getBusinessEmployees(req, res, next) {
    UserService.getEmployees(req.user.businessId, next.wrap(function (result) {
        res.json(result);
    }));
}

/**
 * Add a business employee
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function addBusinessEmployee(req, res, next) {
    var values = req.body;
    var error = validate(values,
        {
            firstName: "ShortString",
            lastName: "ShortString",
            username: "ShortString",
            password: "ShortString"
        });
    if (error) {
        return next(error);
    }
    values.userRoles = [{businessId: req.user.businessId, role: Const.UserRole.BUSINESS_EMPLOYEE}];
    UserService.create(values, next.wrap(function (result) {
        res.json(helper.mapUser(result));
    }));
}

/**
 * Update a business employee
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function updateBusinessEmployee(req, res, next) {
    var values = _.pick(req.body, 'firstName', 'lastName', 'username', 'password');
    UserService.update(req.params.id, values, next.wrap(function (result) {
        res.json(helper.mapUser(result));
    }));
}

/**
 * Delete a business employee
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function deleteBusinessEmployee(req, res, next) {
    UserService.remove(req.params.id, next.wrap(function () {
        res.end();
    }));
}

/**
 * Pay a fee and verify business
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function payForVerification(req, res, next) {
    BusinessService.payForVerification(req.user.businessId, req.body.merchantAccountParams, req.body.paymentInfo,  next.wrap(function (business) {
        res.json(business);
    }));
}

/**
 * Verify business by administrator
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function verifyByPlatformAdmin(req, res, next) {
    BusinessService.update(req.params.id, {isVerified: true}, next.wrap(function (business) {
        res.json(business);
    }));
}


/**
 * Get business actions of current user
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function getMyBusinessActions(req, res, next) {
    var criteria = req.query;
    var apiResult;
    helper.fixQueryStringForSearchCriteria(criteria);
    criteria.businessId = req.user.businessId;
    async.waterfall([
        function (cb) {
            ActionRecordService.search(criteria, cb);
        }, function (result, cb) {
            //populate display name for user
            apiResult = result;
            var users = _.pluck(result.items, "userId");
            if (!users.length) {
                res.json(result);
                return;
            }
            UserService.search({_id: {$in: users}}, cb);
        }, function (users) {
            var index = _.indexBy(users, "id");
            _.each(apiResult.items, function (item) {
                var user = index[item.userId];
                if (user) {
                    item.user = user.firstName + " " + user.lastName;
                }
            });
            res.json(apiResult);
        }
    ], next);
}

/**
 * Get all business actions.
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function getAllBusinessActions(req, res, next) {
    var criteria = req.query;
    helper.fixQueryStringForSearchCriteria(criteria);
    ActionRecordService.search(criteria, next.wrap(function (result) {
        res.json(result);
    }));
}

module.exports = {
    getMyBusinessProfile: getMyBusinessProfile,
    getBusinessProfile: getBusinessProfile,
    getBusinessEmployees: getBusinessEmployees,
    updateMyBusinessProfile: updateMyBusinessProfile,
    addBusinessEmployee: addBusinessEmployee,
    updateBusinessEmployee: [_checkEmployeePermission, updateBusinessEmployee],
    deleteBusinessEmployee: [_checkEmployeePermission, deleteBusinessEmployee],
    payForVerification: payForVerification,
    verifyByPlatformAdmin: verifyByPlatformAdmin,
    getMyBusinessActions: getMyBusinessActions,
    getAllBusinessActions: getAllBusinessActions,
    searchBusinesses: searchBusinesses
};
