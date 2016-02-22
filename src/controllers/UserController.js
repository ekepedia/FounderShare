/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */

/**
 * This controller exposes REST actions for user
 *
 * Changes in version 1.1:
 * - Added verifyEmail() method and fixed some other issues.
 *
 * Changes in version 1.2
 * - Capitalize 'i' in 'invalid email or password'
 * - Add API's to add, get and delete platform employees
 *
 * Changes in version 1.3
 * - Add API for update platform admin
 *
 * Changes in version 1.4 (Project Mom and Pop - MiscUpdate5):
 * - [PMP-206] Remove Business.conditions field
 *
 * Changes in version 1.5 (Project Mom and Pop - Release Fall 2015 Assembly):
 * - [PMP-220] Add subscribedToNews field
 * - Fixed critical bug that crashes the server when email is verified twice
 * - Limit profile picture size to 1Mb
 *
 * @author TCSASSEMBLER
 * @version 1.5
 */
'use strict';

var async = require("async");
var _ = require("underscore");
var config = require("config");
var awsHelper = require("../common/awsHelper");
var helper = require("../common/helper");
var ValidationError = require("../common/errors").ValidationError;
var UnauthorizedError = require("../common/errors").UnauthorizedError;
var NotFoundError = require("../common/errors").NotFoundError;
var validate = require("../common/validator").validate;
var Const = require("../Const");
var UserService = require("../services/UserService");
var SecurityService = require("../services/SecurityService");
var BusinessService = require("../services/BusinessService");
var NotificationService = require("../services/NotificationService");
var ActionRecordService = require("../services/ActionRecordService");

/**
 * Register a user.
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function registerUser(req, res, next) {
    var registration, userId;
    try {
        registration = JSON.parse(req.body.registration);
    } catch (e) {
        return next(new ValidationError("registration field must be a valid json object"));
    }
    var error = validate(
        {registration: registration},
        {
            registration: {
                __strict: false,
                accountType: "AccountType",
                linkedSocialNetwork: "SocialNetwork?",
                linkedSocialNetworkAccessToken: "ShortString?"
            }
        });
    if (error) {
        return next(error);
    }

    // Photo file size can not exceed 1Mb (1048576 bytes)
    if (req.files && req.files.profileImage && req.files.profileImage.size > 1048576) {
	return next(new ValidationError("Your profile picture can not exceed 1Mb in size."));
    }

    var user = {};
    async.waterfall([
        function (cb) {
            if (registration.linkedSocialNetwork) {
                if (!registration.linkedSocialNetworkAccessToken) {
                    return next(new ValidationError('linkedSocialNetworkAccessToken is required'));
                }
                if (registration.linkedSocialNetwork === Const.SocialNetwork.TWITTER) {
                    error = validate(
                        {email: registration.email},
                        {email: "email"});
                    if (error) {
                        return cb(error);
                    }
                }
                SecurityService.getSocialNetworkProfile(registration.linkedSocialNetwork, registration.linkedSocialNetworkAccessToken, cb.wrap(function (profile) {
                    _.extend(user, profile);
                    if (registration.linkedSocialNetwork === Const.SocialNetwork.TWITTER) {
                        user.email = registration.email;
                    }
                    cb();
                }));
            } else {
                //for normal login these fields are expected
                error = validate(
                    {registration: registration},
                    {
                        registration: {
                            __strict: false,
                            firstName: "ShortString",
                            lastName: "ShortString",
                            email: "email",
                            password: "ShortString",
                            interestedOfferCategory: "ShortString?",
			    subscribedToNews: "bool?"
                        }
                    });
                if (error) {
                    return cb(error);
                }
                _.extend(user, _.pick(registration, "firstName", "lastName", "email", "password", "interestedOfferCategory", "subscribedToNews"));
                cb();
            }
        }, function (cb) {
            if (!user.email) {
                return cb();
            }
            UserService.getByEmail(user.email, cb.wrap(function (user) {
                if (user) {
                    cb(new ValidationError('This email address is already registered'));
                } else {
                    cb();
                }
            }));
        }, function (cb) {
            if (req.files && req.files.profileImage) {
                awsHelper.uploadPhotoToS3(req.files.profileImage, cb.wrap(function (url) {
                    user.picture = url;
                    cb();
                }));
            } else {
                cb();
            }
        }, function (cb) {
            if (registration.accountType === Const.AccountType.CHAMPION) {
                user.userRoles = [{
                    role: Const.UserRole.INDIVIDUAL_USER
                }];
                cb();
            } else {
                if (!registration.hasOwnProperty("business")) {
                    registration.business = {};
                }
                var business = _.pick(registration.business, "name", "type", "streetAddress", "city", "state", "country", "zip", "telephoneNumber", "businessHours", "description", "website");
                async.waterfall([
                    function (cb) {
                        if (req.files && req.files.businessImage) {
                            awsHelper.uploadPhotoToS3(req.files.businessImage, cb.wrap(function (url) {
                                business.picture = url;
                                cb();
                            }));
                        } else {
                            cb();
                        }
                    }, function (cb) {
                        BusinessService.create(business, cb);
                    }, function (result, cb) {
                        user.userRoles = [{
                            businessId: result.id,
                            role: Const.UserRole.BUSINESS_ADMIN
                        }];
                        cb();
                    }
                ], cb);
            }
        }, function (cb) {
            user.verifyEmailText = helper.randomString(Const.SAFE_RANDOM_LENGTH);
            user.verifyEmailExpirationDate = new Date().getTime();
            UserService.create(user, cb);
        }, function (user, cb) {
            userId = user.id;
            var token = userId + "/" + user.verifyEmailText;
            NotificationService.sendEmail(user.email, 'verify-user-email',
                {token: token, prefix: config.VERIFY_EMAIL_URL_PREFIX}, cb);
        }, function (user, cb) {
            SecurityService.generateSessionToken(userId, cb);
        }, function (token) {
            res.json({
                sessionToken: token
            });
        }
    ], next);
}

/**
 * Verify email.
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 * @return the session token.
 */
function verifyEmail(req, res, next) {
    var requestData;
    try {
        requestData = JSON.parse(req.body.requestData);
    } catch (e) {
        return next(new ValidationError("requestData field must be a valid json object"));
    }
    var error = validate(
        {requestData: requestData},
        {
            requestData: {
                __strict: false,
                userId: "ShortString?",
                token: "ShortString?"
            }
        });
    if (error) {
        return next(error);
    }

    async.waterfall([
        function (cb) {
            UserService.get(requestData.userId, cb.wrap(function (user) {
                if (!user) {
                    cb(new ValidationError('Cannot find the user by given user id.'));
                } else {
                    if (!user.verifyEmailText || user.verifyEmailText === 'verified') {
                        return cb(new ValidationError('The Email address is already verified.'));
                    }
                    if (user.verifyEmailText !== requestData.token) {
                        return cb(new ValidationError('The email verification text is invalid.'));
                    }

                    var newUser = {verifyEmailText: 'verified',
                        verifyEmailExpirationDate: new Date().getTime() + 100 * 365 * 24 * 60 * 60 * 1000};
                    UserService.update(user.id, newUser, cb);
                }
            }));
        }, function (user, cb) {
            SecurityService.generateSessionToken(requestData.userId, cb);
        }, function (token) {
            res.json({
                sessionToken: token
            });
        }
    ], next);
}

/**
 * Register a user.
 * @param  {Object} req the request
 * @param  {Object} res the response
 * @param  {Function} next the next middleware
 */
function login(req, res, next) {
    var error = validate(
        {loginType: req.query.type},
        {loginType: "AuthenticationType"});
    if (error) {
        return next(error);
    }
    var type = req.query.type;
    if (type === Const.AuthenticationType.PASSWORD) {
        SecurityService.authenticate(req.body.email, req.body.password, function (err, user) {
            if (err) {
                if (err.httpStatus === 400) {
                    return next(err);
                }
                return next(new UnauthorizedError("Invalid email or password"));
            }
            SecurityService.generateSessionToken(user.id, next.wrap(function (token) {
                res.json({
                    sessionToken: token
                });
            }));
        });
    } else {
        var token = req.body.accessToken;
        async.waterfall([
            function (cb) {
                SecurityService.authenticateWithSocialNetwork(type, token, cb);
            }, function (profile, cb) {
                UserService.getBySocialNetwork(type, String(profile.id), cb);
            }, function (user, cb) {
                if (user) {
                    SecurityService.generateSessionToken(user.id, cb);
                } else {
                    cb(new NotFoundError('User is not registered'));
                }
            }, function (token) {
                res.json({
                    sessionToken: token
                });
            }
        ], next);
    }
}

/**
 * Get profile of logged user.
 * @param  {Object} req the request
 * @param  {Object} res the response
 * @param  {Function} next the next middleware
 */
function getMyUserProfile(req, res, next) {
    if (!req.user.businessId) {
        return res.json(req.user);
    }
    BusinessService.get(req.user.businessId, next.wrap(function (business) {
        req.user.business = business;
        return res.json(req.user);
    }));
}

/**
 * Update profile of logged user.
 * @param  {Object} req the request
 * @param  {Object} res the response
 * @param {Function} next the next middleware
 */
function updateMyUserProfile(req, res, next) {
    var values = req.body;
    values = _.pick(values, 'password', 'firstName', 'lastName', 'email', 'location', 'isFirstNamePublic',
		    'isLastNamePublic', 'isEmailPublic', 'isLocationPublic', 'isPicturePublic', 'interestedOfferCategory', 'subscribedToNews');
    _.each(['isFirstNamePublic', 'isLastNamePublic', 'isEmailPublic', 'isLocationPublic', 'isPicturePublic', 'subscribedToNews'], function (prop) {
        if (values.hasOwnProperty(prop)) {
            if (values[prop] === 'true') {
                values[prop] = true;
            }
            if (values[prop] === 'false') {
                values[prop] = false;
            }
        }
    });


    // Photo file size can not exceed 1Mb (1048576 bytes)
    if (req.files && req.files.image && req.files.image.size > 1048576) {
	return next(new ValidationError("Your profile picture can not exceed 1Mb in size."));
    }

    async.waterfall([
        function (cb) {
            if (req.files && req.files.image) {
                awsHelper.uploadPhotoToS3(req.files.image, cb.wrap(function (url) {
                    values.picture = url;
                    cb();
                }));
            } else {
                cb();
            }
        }, function (cb) {
            UserService.update(req.user.id, values, cb);
        }, function (user) {
            res.json(helper.mapUser(user));
        }
    ], next);
}

/**
 * Send email with reset password link
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function recoverPassword(req, res, next) {
    var error = validate(
        {email: req.query.email},
        {email: "email"});
    if (error) {
        return next(error);
    }
    var email = req.query.email;
    async.waterfall([
        function (cb) {
            SecurityService.recoverPassword(email, cb);
        }, function (token, cb) {
            var resetLink;
            if (req.query.version === "mobile") {
                resetLink = config.MOBILE_APP_URL + '/#/ResetPassword?token=' + token;
            } else {
                resetLink = config.DESKTOP_APP_URL + '/#/ResetPassword?token=' + token;
            }
	    NotificationService.notifyUserOfPassword(email, resetLink, cb);
        }, function () {
            res.end();
        }
    ], next);
}

/**
 * Reset password using a reset password token
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function resetForgottenPassword(req, res, next) {
    async.waterfall([
        function (cb) {
            SecurityService.updateForgottenPassword(req.body.token, req.body.newPassword, cb);
        }, function (user, cb) {
            SecurityService.generateSessionToken(user.id, cb);
        }, function (token) {
            res.json({
                sessionToken: token
            });
        }
    ], next);
}

/**
 * Reset a password
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function resetPassword(req, res, next) {
    async.waterfall([
        function (cb) {
            SecurityService.updatePassword(req.user.id, req.body.newPassword, cb);
        }, function () {
            res.end();
        }
    ], next);
}

/**
 * Revoke the access token
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function revokeAccessToken(req, res, next) {
    SecurityService.revokeSessionToken(req.sessionToken, next.wrap(function () {
        res.end();
    }));
}

/**
 * Refresh the access token
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function refreshAccessToken(req, res, next) {
    async.waterfall([
        function (cb) {
            SecurityService.revokeSessionToken(req.sessionToken, cb);
        }, function (cb) {
            SecurityService.generateSessionToken(req.user.id, cb);
        }, function (token) {
            res.json({
                sessionToken: token
            });
        }
    ], next);
}

/**
 * Get actions of current user
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function getMyActions(req, res, next) {
    var criteria = req.query;
    helper.fixQueryStringForSearchCriteria(criteria);
    criteria.userId = req.user.id;
    ActionRecordService.search(criteria, next.wrap(function (result) {
        res.json(result);
    }));
}

/**
 * Add a platform employee
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function addPlatformAdmin(req, res, next) {
    UserService.addPlatformAdmin(req.body, req.user, next.wrap(function (result) {
        res.json(helper.mapUser(result));
    }));
}

/**
 * Get all platform employees
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function getAllPlatformAdmins(req, res, next) {
    UserService.getAllPlatformAdmins(next.wrap(function (result) {
        var users = [];
        _.forEach(result, function(user) {
            users.push(helper.mapUser(user));
        });
        res.json(users);
    }));
}

/**
 * Delete all platform employees
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function deletePlatformAdmin(req, res, next) {
    UserService.deletePlatformAdmin(req.params.id, req.body, req.user, next.wrap(function (result) {
        res.json(result);
    }));
}

/**
 * Verify a platform employee
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function verifyPlatformAdmin(req, res, next) {
    UserService.verifyPlatformAdmin(req.body, next.wrap(function (result) {
        res.json(result);
    }));
}

/**
 * Update a platform employee
 * A platform employee can only update own profile information
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function updatePlatformAdmin(req, res, next) {
    UserService.updatePlatformAdmin(req.body, req.user, next.wrap(function (result) {
        res.json(result);
    }));
}

module.exports = {
    registerUser: registerUser,
    verifyEmail: verifyEmail,
    login: login,
    getMyUserProfile: getMyUserProfile,
    updateMyUserProfile: updateMyUserProfile,
    recoverPassword: recoverPassword,
    resetForgottenPassword: resetForgottenPassword,
    resetPassword: resetPassword,
    revokeAccessToken: revokeAccessToken,
    refreshAccessToken: refreshAccessToken,
    getMyActions: getMyActions,
    addPlatformAdmin: addPlatformAdmin,
    getAllPlatformAdmins: getAllPlatformAdmins,
    deletePlatformAdmin: deletePlatformAdmin,
    verifyPlatformAdmin: verifyPlatformAdmin,
    updatePlatformAdmin: updatePlatformAdmin
};
