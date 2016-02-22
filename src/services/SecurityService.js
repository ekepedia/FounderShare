/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */
/**
 * This service provides methods to security functionality.
 *
 * Changes in version 1.1:
 *  - Updated the authenticate() method to check email verification.
 * Changes in version 1.2:
 *  - Extend access token each time authenticateWithSessionToken is called
 *
 * Changes in version 1.3
 * - While resetting the forgotten password, implicitly verify the unverified email
 *
 * @version 1.3
 * @author TCSASSEMBLER
 */
'use strict';

var async = require('async');
var _ = require('underscore');
var config = require('config');
var request = require('request');
var bcrypt = require('bcrypt-nodejs');
var validate = require("../common/validator").validate;
var logging = require("../common/logging");
var helper = require("../common/helper");
var Const = require("../Const");
var BadRequestError = require("../common/errors").BadRequestError;
var ForbiddenError = require("../common/errors").ForbiddenError;
var NotFoundError = require("../common/errors").NotFoundError;
var OAuth = require('oauth-1.0a');
var UserService = require("./UserService");
var SessionToken = require('../models').SessionToken;
var User = require('../models').User;

//oauth for twitter
var oauth = new OAuth({
    consumer: {
        public: config.TWITTER_CONSUMER_KEY,
        secret: config.TWITTER_CONSUMER_SECRET
    },
    signature_method: 'HMAC-SHA1'
});

/**
 * Implements the basic email/password based authentication
 *
 * @param  {String} email the email address of user
 * @param  {String} password the password of user
 * @param  {Function} callback the callback function
 */
function authenticate(email, password, callback) {
    var error = validate(
        {email: email, password: password},
        {email: "ShortString", password: "ShortString"});
    if (error) {
        return callback(error);
    }
    var user;
    async.waterfall([
        function (cb) {
            UserService.getByEmail(email, cb);
        }, function (result, cb) {
            user = result;
            if (!user) {
                return cb(new NotFoundError('User not found'));
            }
            if (user.verifyEmailText && (user.verifyEmailText !== 'verified')) {
                return cb(new NotFoundError('User email is not verified.'));
            }
            bcrypt.compare(password, user.passwordHash, cb);
        }, function (result, cb) {
            if (result) {
                cb(null, user);
            } else {
                cb(new ForbiddenError('Invalid password'));
            }
        }
    ], function (err, result) {
        callback(err, helper.mapUser(result));
    });
}

/**
 * Get profile of a social network account
 *
 * @param {String} socialNetwork the name of social network
 * @param {String} accessToken the social network access token
 * @param {function(Error, Object)} callback the callback function with arguments
 * - the error
 * - the social network profile
 */
function authenticateWithSocialNetwork(socialNetwork, accessToken, callback) {
    var error = validate(
        {socialNetwork: socialNetwork, accessToken: accessToken},
        {socialNetwork: "SocialNetwork", accessToken: "ShortString"});
    if (error) {
        return callback(error);
    }

    var getProfile = function (error, response, body) {
        if (error) {
            return callback(error);
        }
        if (response.statusCode === 200) {
            return callback(null, body);
        } else {
            callback(new Error("Cannot get profile: " + JSON.stringify(body)));
        }
    };

    if (socialNetwork === Const.SocialNetwork.FACEBOOK) {
        request.get(Const.FACEBOOK_PROFILE_URL, {
            'auth': {
                'bearer': accessToken
            },
            json: true
        }, getProfile);
    } else if (socialNetwork === Const.SocialNetwork.TWITTER) {
        // twitter implements oauth 1.0a
        // so client will pass a base64 encoded string of accessToken:accessTokenSecret
        var plainAuth = new Buffer(accessToken, 'base64').toString().split(':');
        if (plainAuth.length !== 2) {
            return callback(new BadRequestError("Access token must be base64 for twitter"));
        }
        var token = {
            public: plainAuth[0],
            secret: plainAuth[1]
        };
        var requestData = {
            url: Const.TWITTER_PROFILE_URL,
            method: 'GET'
        };
        request({
            url: requestData.url,
            method: requestData.method,
            headers: oauth.toHeader(oauth.authorize(requestData, token)),
            json: true
        }, getProfile);
    } else if (socialNetwork === Const.SocialNetwork.LINKEDIN) {
        var options = {
            json: true
        };
        options.auth = {
            'bearer': accessToken
        };
        request.get(Const.LINKEDIN_PROFILE_URL, options, getProfile);
    } else {
        //shouldn't happen
        callback(new Error('"' + socialNetwork + '" social network not supported'));
    }
}

/**
 * Get a user profile from the social network. Profile is consistent for all network types
 *
 * @param {String} socialNetwork the name of social network
 * @param {String} accessToken the social network access token
 * @param {function(Error, Object)} callback the callback function with arguments
 * - the error
 * - the social network profile
 */
function getSocialNetworkProfile(socialNetwork, accessToken, callback) {
    var error = validate(
        {socialNetwork: socialNetwork, accessToken: accessToken},
        {socialNetwork: "SocialNetwork", accessToken: "ShortString"});
    if (error) {
        return callback(error);
    }
    var profile;
    async.waterfall([
        function (cb) {
            authenticateWithSocialNetwork(socialNetwork, accessToken, cb);
        },
        function (result, cb) {
            result.id = String(result.id);
            if (socialNetwork === Const.SocialNetwork.FACEBOOK) {
                profile = {
                    email: result.email,
                    firstName: result.first_name,
                    lastName: result.last_name,
                    linkedSocialNetwork: socialNetwork,
                    linkedSocialNetworkUserId: result.id
                };
                cb(null, profile);
            } else if (socialNetwork === Const.SocialNetwork.TWITTER) {
                profile = {
                    firstName: result.screen_name,
                    linkedSocialNetwork: socialNetwork,
                    linkedSocialNetworkUserId: result.id
                };
                cb(null, profile);
            } else if (socialNetwork === Const.SocialNetwork.LINKEDIN) {
                profile = {
                    firstName: result.firstName,
                    lastName: result.lastName,
                    email: result.emailAddress,
                    picture: result.pictureUrl,
                    linkedSocialNetwork: socialNetwork,
                    linkedSocialNetworkUserId: result.id
                };
                cb(null, profile);
            } else {
                //shouldn't happen
                cb(new Error('"' + socialNetwork + '" social network not supported'));
            }
        }
    ], callback);
}


/**
 * Generate the session token to be returned to client in case of login request
 * @param {String} userId the userId of user to generate token for
 * @param {function(Error, String)} callback the callback function with arguments
 * - the error
 * - the session token
 */
function generateSessionToken(userId, callback) {
    var error = validate(
        {userId: userId},
        {userId: "ObjectId"});
    if (error) {
        return callback(error);
    }
    var token = helper.randomString(Const.SAFE_RANDOM_LENGTH);
    SessionToken.create({
        userId: userId,
        token: token,
        expirationDate: new Date().getTime() + config.SESSION_TOKEN_DURATION
    }, callback.wrap(function (sessionToken) {
        callback(null, sessionToken.token);
    }));
}


/**
 * Generate a hash of the given plainText string
 * @param  {String} plainText the plain text string
 * @param {function(Error, String)} callback the callback function with arguments
 * - the error
 * - the hash
 */
function generateHash(plainText, callback) {
    var error = validate(
        {plainText: plainText},
        {plainText: "ShortString"});
    if (error) {
        return callback(error);
    }
    async.waterfall([
        function (cb) {
            bcrypt.genSalt(config.SALT_WORK_FACTOR, cb);
        },
        function (salt, cb) {
            bcrypt.hash(plainText, salt, null, cb);
        }
    ], callback);
}


/**
 * Authenticate the user based on the bearer session token
 *
 * @param  {String} token the session access token
 * @param {function(Error, User, Date)} callback the callback function with arguments
 * - the error
 * - the hash
 * - the token expiration date
 */
function authenticateWithSessionToken(token, callback) {
    var error = validate(
        {token: token},
        {token: "ShortString"});
    if (error) {
        return callback(error);
    }
    var expirationDate;
    async.waterfall([
        function (cb) {
            SessionToken.findOne({token: token}, cb);
        }, function (sessionToken, cb) {
            if (!sessionToken) {
                return cb(new ForbiddenError('Session Token not found'));
            }
            if (sessionToken.expirationDate > new Date()) {
                sessionToken.expirationDate  = new Date().getTime() + config.SESSION_TOKEN_DURATION;
                sessionToken.save(cb);
            } else {
                // token expired
                cb(new ForbiddenError('Session Token Expired'));
            }
        }, function (sessionToken, count, cb) {
            expirationDate = sessionToken.expirationDate;
            helper.ensureExists(User, sessionToken.userId, cb);
        }
    ], function (err, user) {
        callback(err, helper.mapUser(user), expirationDate);
    });
}

/**
 * Reset password token for the user
 * @param {String} email the email address of user
 * @param {function(Error, String)} callback the callback function with arguments
 * - the error
 * - the token
 */
function recoverPassword(email, callback) {
    var error = validate(
        {email: email},
        {email: "email"});
    if (error) {
        return callback(error);
    }
    var token = helper.randomString(Const.SAFE_RANDOM_LENGTH);
    async.waterfall([
        function (cb) {
            UserService.getByEmail(email, cb);
        }, function (user, cb) {
            if (!user) {
                return cb(new NotFoundError("user not found"));
            }
            User.findByIdAndUpdate(user.id, {
                resetPasswordToken: token,
                resetPasswordExpired: false
            }, cb);
        }
    ], function (err) {
        callback(err, token);
    });
}

/**
 * Reset password for the user
 * @param {String} token the reset password token
 * @param {String} password the new password
 * @param {function(Error, User)} callback the callback function with arguments
 * - the error
 * - the updated user
 */
function updateForgottenPassword(token, password, callback) {
    var error = validate(
        {token: token, password: password},
        {token: "ShortString", password: "ShortString"});
    if (error) {
        return callback(error);
    }
    var user;
    async.waterfall([
        function (cb) {
            User.findOne({resetPasswordToken: token, resetPasswordExpired: false}, cb);
        }, function (result, cb) {
            user = result;
            if (!user) {
                return cb(new BadRequestError("Invalid or expired token"));
            }
            generateHash(password, cb);
        }, function (hash, cb) {
            // if the email is not verified, verify the email implicitly as reset password ultimately is done through email verification
            user.passwordHash = hash;
            user.resetPasswordExpired = true;
            user.resetPasswordToken = null;
            user.verifyEmailText = 'verified';
            user.save(cb.errorOnly());
        }
    ], function (err) {
        callback(err, helper.mapUser(user));
    });
}

/**
 * Reset password for the user
 * @param {ObjectId} userId the user id
 * @param {String} password the new password
 * @param {function(Error)} callback the callback function with arguments
 * - the error
 */
function updatePassword(userId, password, callback) {
    var error = validate(
        {userId: userId, password: password},
        {userId: "ObjectId", password: "ShortString"});
    if (error) {
        return callback(error);
    }
    var user;
    async.waterfall([
        function (cb) {
            helper.ensureExists(User, userId, cb);
        }, function (result, cb) {
            user = result;
            generateHash(password, cb);
        }, function (hash, cb) {
            user.passwordHash = hash;
            user.save(cb.errorOnly());
        }
    ], callback);
}

/**
 * Revoke a session token
 * @param {String} token the token
 * @param {function(Error)} callback the callback function with arguments
 * - the error
 */
function revokeSessionToken(token, callback) {
    var error = validate(
        {token: token},
        {token: "ShortString"});
    if (error) {
        return callback(error);
    }
    helper.ensureExists(SessionToken, {token: token}, callback.wrap(function (sessionToken) {
        sessionToken.remove(callback.errorOnly());
    }));
}

_.extend(module.exports, {
    authenticate: logging.createWrapper(authenticate, {
        input: ["email", "password"],
        output: ["user"],
        signature: "SecurityService#authenticate"
    }),
    authenticateWithSocialNetwork: logging.createWrapper(authenticateWithSocialNetwork, {
        input: ["socialNetwork", "accessToken"],
        output: ["profile"],
        signature: "SecurityService#authenticateWithSocialNetwork"
    }),
    getSocialNetworkProfile: logging.createWrapper(getSocialNetworkProfile, {
        input: ["socialNetwork", "accessToken"],
        output: ["profile"],
        signature: "SecurityService#authenticateWithSocialNetwork"
    }),
    generateSessionToken: logging.createWrapper(generateSessionToken, {
        input: ["userId"],
        output: ["token"],
        logOutput: false,
        signature: "SecurityService#generateSessionToken"
    }),
    generateHash: logging.createWrapper(generateHash, {
        input: ["plainText"],
        output: ["hash"],
        logOutput: false,
        logInput: false,
        signature: "SecurityService#generateHash"
    }),
    authenticateWithSessionToken: logging.createWrapper(authenticateWithSessionToken, {
        input: ["token"],
        output: ["user", "expiration"],
        signature: "SecurityService#authenticateWithSessionToken"
    }),
    recoverPassword: logging.createWrapper(recoverPassword, {
        input: ["email"],
        output: ["token"],
        logOutput: false,
        signature: "SecurityService#recoverPassword"
    }),
    updateForgottenPassword: logging.createWrapper(updateForgottenPassword, {
        input: ["token", "password"],
        output: ["user"],
        signature: "SecurityService#updateForgottenPassword"
    }),
    updatePassword: logging.createWrapper(updatePassword, {
        input: ["userId", "password"],
        output: [],
        signature: "SecurityService#updatePassword"
    }),
    revokeSessionToken: logging.createWrapper(revokeSessionToken, {
        input: ["token"],
        output: [],
        signature: "SecurityService#revokeSessionToken"
    })
});
