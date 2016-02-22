/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */
/**
 * This service provides methods to manage User.
 *
 * Changes in version 1.1:
 *  - Added getByUsername() and getAll() method.
 *  - Fixed some other issues.
 * Changes in version 1.2:
 *  - Add search
 *
 * Changes in version 1.3
 * - Add API's to add, delete, get platform employee
 *
 * Changes in version 1.4
 * - Add API to update a platform employee
 * - Nobody should be able to delete a preconfigured default platform admin
 *
 * Changes in version 1.5
 * - Fix: Update user with email of another user should fail
 * - Code style fixes (missing ";")
 *
 * Changes in version 1.6 (Project Mom and Pop - MiscUpdate5):
 * - [PMP-204] Save lowercase version of username in email_lowered
 *
 * Changes in version 1.7 (Project Mom and Pop - Release Fall 2015 Assembly):
 * - [PMP-220] Add subscribedToNews field
 * - [PMP-233] Add signedUpDate and verifiedDate
 *
 * @version 1.7
 * @author TCSASSEMBLER
 */
'use strict';

var _ = require('underscore');
var async = require('async');
var validate = require("../common/validator").validate;
var logging = require("../common/logging");
var helper = require("../common/helper");
var BadRequestError = require("../common/errors").BadRequestError;
var ForbiddenError = require("../common/errors").ForbiddenError;
var NotFoundError = require("../common/errors").NotFoundError;
var User = require('../models').User;
var Const = require('../Const');
var SecurityService = require("./SecurityService");
var NotificationService = require("./NotificationService");
var bcrypt = require('bcrypt-nodejs');
var config = require('config');
var ActionRecordService = require('./ActionRecordService');

var DEFAULT_STRING = "n/a";

/**
 * Create a user
 * @param {Object} user the user to create
 * @param {function(Error, User)} callback the callback function with arguments
 * - the error
 * - the created user
 */
function create(user, callback) {
    var error = validate(
        {user: user},
        {
            user: {
                firstName: "ShortString",
                lastName: "ShortString?",
                email: "email?",
                username: "ShortString?",
                location: "ShortString?",
                picture: "ShortString?",
                password: "ShortString?",
		subscribedToNews: "bool?",
                userRoles: [{
                    businessId: "ObjectId?",
                    role: "UserRole"
                }],
                linkedSocialNetwork: "SocialNetwork?",
                linkedSocialNetworkUserId: "ShortString?",
                isFirstNamePublic: "bool?",
                isLastNamePublic: "bool?",
                isEmailPublic: "bool?",
                isLocationPublic: "bool?",
                isPicturePublic: "bool?",
                verifyEmailText: "ShortString?",
                verifyEmailExpirationDate: "Number? >=0"
            }
        });
    if (error) {
        return callback(error);
    }
    if (user.email) {
        user.email_lowered = user.email.toLowerCase();
    }
    async.waterfall([
        function (cb) {
            if (user.email_lowered) {
                getByEmail(user.email_lowered, cb);
            } else {
                cb(null, null);
            }
        }, function (existing, cb) {
            if (existing) {
                return cb(new BadRequestError('This email address is already registered'));
            }
            if (user.username) {
                getByUsername(user.username, cb);
            } else {
                cb(null, null);
            }
        }, function (existing, cb) {
            if (existing) {
                return cb(new BadRequestError('This username is already registered'));
            }
            if (user.username) {
		/* User was added by a business admin and given a
		 * username. The login system requires an email
		 * address to find a user. So we set the email
		 * property to match the username. */
                user.email = user.username;
                user.email_lowered = user.username.toLowerCase();
                delete user.username;
            }
            if (user.password) {
                SecurityService.generateHash(user.password, cb);
            } else {
                cb(null, null);
            }
        }, function (hash) {
            if (hash) {
                user.passwordHash = hash;
                delete user.password;
            }
	    user.signedUpDate = new Date();
            User.create(user, callback);
        }
    ], function (err, count, user) {
        callback(err, _.toJSON(user));
    });
}

/**
 * Update a user
 * @param {ObjectId} userId the user id to update
 * @param {Object} user the user to update
 * @param {function(Error, User)} callback the callback function with arguments
 * - the error
 * - the updated user
 */
function update(userId, user, callback) {
    var error = validate(
        {userId: userId, user: user},
        {
            userId: "ObjectId",
            user: {
                firstName: "ShortString?",
                lastName: "ShortString?",
                email: "email?",
                username: "ShortString?",
                location: "ShortString?",
                picture: "ShortString?",
                password: "ShortString?",
		subscribedToNews: "bool?",
                userRoles: {
                    type: [{
                        businessId: "ObjectId?",
                        role: "UserRole"
                    }], required: false
                },
                linkedSocialNetwork: "SocialNetwork?",
                linkedSocialNetworkUserId: "ShortString?",
                isFirstNamePublic: "bool?",
                isLastNamePublic: "bool?",
                isEmailPublic: "bool?",
                isLocationPublic: "bool?",
                isPicturePublic: "bool?",
                verifyEmailText: "ShortString?",
                verifyEmailExpirationDate: "Number? >=0"
            }
        });
    if (error) {
        return callback(error);
    }
    if (user.email) {
        user.email_lowered = user.email.toLowerCase();
    }
    var existing;
    async.waterfall([
        function (cb) {
            helper.ensureExists(User, userId, cb);
        }, function (result, cb) {
            existing = result;
            if (user.email_lowered && user.email_lowered !== existing.email_lowered) {
                getByEmail(user.email_lowered, cb);
            } else {
                cb(null, null);
            }
        }, function (otherUser, cb) {
	    if (otherUser) {
                return cb(new BadRequestError("Cannot change username. Username is already used by different user."));
            }
            if (user.username && user.username !== existing.email) {
                getByUsername(user.username, cb);
            } else {
                cb(null, null);
            }
        }, function (otherUser, cb) {
            if (otherUser) {
                return cb(new BadRequestError("Cannot change username. Username is already used by different user."));
            }

            if (user.username) {
                user.email = user.username;
                user.email_lowered = user.username.toLowerCase();
                delete user.username;
            }
            if (user.password) {
                SecurityService.generateHash(user.password, cb);
            } else {
                cb(null, null);
            }
        }, function (hash, cb) {
            if (hash) {
                user.passwordHash = hash;
                delete user.password;
            }
	    if (user.verifyEmailText === 'verified') {
		user.verifiedDate = new Date();
	    }
            _.extend(existing, user);
            existing.save(cb);
        }
    ], function (err, user) {
        callback(err, _.toJSON(user));
    });
}

/**
 * Remove a user
 * @param {ObjectId} userId the user id to remove
 * @param {function(Error)} callback the callback function with arguments
 * - the error
 */
function remove(userId, callback) {
    var error = validate(
        {userId: userId},
        {userId: "ObjectId"});
    if (error) {
        return callback(error);
    }
    async.waterfall([
        function (cb) {
            helper.ensureExists(User, userId, cb);
        }, function (user, cb) {
            user.remove(cb.errorOnly());
        }
    ], callback);
}

/**
 * Get user by email address
 * @param {String} email the email address
 *
 * @param {function(Error, User)} callback the callback function with arguments
 * - the error
 * - the user or null if not found
 */
function getByEmail(email, callback) {
    var error = validate(
        {email: email},
        {email: "ShortString"});
    if (error) {
        return callback(error);
    }
    User.findOne({email_lowered: email.toLowerCase()}, function (err, result) {
        callback(err, _.toJSON(result));
    });
}

/**
 * Get user by username.
 * @param username the username.
 * @param callback the callback method.
 * @returns {*} the search result.
 */
function getByUsername(username, callback) {
    var error = validate(
        {username: username},
        {username: "ShortString"});
    if (error) {
        return callback(error);
    }
    User.findOne({email_lowered: username.toLowerCase()}, function (err, result) {
        callback(err, _.toJSON(result));
    });
}

/**
 * Get all users.
 * @param callback the callback method.
 */
function getAll(callback) {
    User.find({}, function (err, result) {
        callback(err, _.toJSON(result));
    });
}

/**
 * Search users
 * @param {String} criteria  the raw mongodb criteria
 * @param callback the callback method.
 */
function search(criteria, callback) {
    User.find(criteria, function (err, result) {
        callback(err, _.toJSON(result));
    });
}

/**
 * Fetch a user by associated social network credentials
 * @param {String} socialNetwork  the social network name can be facebook, twitter, linkedin
 * @param {String} linkedSocialNetworkUserId  user id of the user to fetch in given social network
 * @param {function(Error, User)} callback the callback function with arguments
 * - the error
 * - the user or null if not found
 */
function getBySocialNetwork(socialNetwork, linkedSocialNetworkUserId, callback) {
    var error = validate(
        {socialNetwork: socialNetwork, linkedSocialNetworkUserId: linkedSocialNetworkUserId},
        {socialNetwork: "SocialNetwork", linkedSocialNetworkUserId: "ShortString"});
    if (error) {
        return callback(error);
    }
    var filter = {
        linkedSocialNetwork: socialNetwork,
        linkedSocialNetworkUserId: linkedSocialNetworkUserId
    };
    User.findOne(filter, callback);
}

/**
 * Get all users that are employees for given business
 * @param {ObjectId} businessId the business id to match
 * @param {function(Error, User[])} callback the callback function with arguments
 * - the error
 * - the users
 */
function getEmployees(businessId, callback) {
    var error = validate(
        {businessId: businessId},
        {businessId: "ObjectId"});
    if (error) {
        return callback(error);
    }
    User.find({
        'userRoles.businessId': businessId,
        'userRoles.role': Const.UserRole.BUSINESS_EMPLOYEE
    }, callback.wrap(function (users) {
        users = _.map(users, helper.mapUser);
        callback(null, users);
    }));
}

/**
 * Get user by id
 * @param {ObjectId} userId the user id
 * @param {function(Error, User)} callback the callback function with arguments
 * - the error
 * - the user
 */
function get(userId, callback) {
    var error = validate(
        {userId: userId},
        {userId: "ObjectId"});
    if (error) {
        return callback(error);
    }
    User.findById(userId, callback);
}

/**
 * Delete a platform employee
 * The operation will be verified by two key authorization
 * 1. User password
 * 2. Special password/token to delete platform employee
 *
 * @param  {ObjectId}   id                  id of the user to delete
 * @param  {Object}     entity              request entity
 * @param  {Object}     authUser            current logged in user
 * @param  {Function}   callback            callback function
 */
function deletePlatformAdmin(id, entity, authUser, callback) {
    var error = validate(
        {password: entity.password},
        {password: "LongString"});
    if (error) {
        return callback(error);
    }
    // check whether the current user has permission to perform the action
    async.waterfall([
        function(cb) {
            User.findById(authUser.id, cb);
        },
        function(user, cb) {
            // check user password
            bcrypt.compare(entity.password, user.passwordHash, cb);
        },
        function(result, cb) {
            if (result) {
                User.findById(id, cb);
            } else {
                cb(new ForbiddenError('Invalid password. You don\'t have permission to perform this operation'));
            }
        },
        function(deleteUser, cb) {
            if (deleteUser.email_lowered.indexOf(config.SKIP_PLATFORM_ADMIN_DELETE) !== -1) {
                return cb(new ForbiddenError('You don\'t have to permission perform this operation'));
            }
            // delete the employee
            deleteUser.remove(function(err) {
                cb(err, deleteUser);
            });
        },
        function(deleteUser, cb) {
            // create action record
            ActionRecordService.create({
                userId: authUser.id,
                businessName: DEFAULT_STRING,
                type: Const.ActionType.DELETE_PLATFORM_ADMIN,
                details: deleteUser.firstName + ' and ' + deleteUser._id,
		metadata: deletedUser
            }, function(err) {
                cb(err);
            });
        }
    ], callback);
}

/**
 * Get all platform employees
 *
 * @param  {Function}   callback            callback function
 */
function getAllPlatformAdmins(callback) {
    User.find({
        'userRoles.role': Const.UserRole.PLATFORM_EMPLOYEE
    }, callback);
}

/**
 * Add a platform employee
 *
 * @param  {Object}     entity              request entity
 * @param  {Object}     authUser            current logged in user
 * @param  {Function}   callback            callback function
 */
function addPlatformAdmin(entity, authUser, callback) {
    var error = validate(
        {email: entity.user.email, firstName: entity.user.firstName, password: entity.password},
        {email: 'email', firstName: 'ShortString', password: 'ShortString'});
    if (error) {
        return callback(error);
    }
    async.waterfall([
        function(cb) {
            User.findById(authUser.id, cb);
        },
        function(user, cb) {
            // check user password
            bcrypt.compare(entity.password, user.passwordHash, cb);
        },
        function(result, cb) {
            if (result) {
                User.findOne({email_lowered: entity.user.email.toLowerCase()}, cb);
            } else {
                cb(new ForbiddenError('Invalid password. You don\'t have permission to perform this operation'));
            }
        },
        function(existingUser, cb) {
            if (existingUser) {
                return cb(new BadRequestError('This email address already exists'));
            }
            User.create({
                firstName: entity.user.firstName,
                email: entity.user.email,
                email_lowered: entity.user.email.toLowerCase(),
                verifyEmailText: helper.randomString(Const.SAFE_RANDOM_LENGTH),
                verifyEmailExpirationDate: new Date().getTime(),
                userRoles: [{
                    role: Const.UserRole.PLATFORM_EMPLOYEE
                }]
            }, cb);
        },
        function(createdUser, cb) {
            var verificationLink = config.DESKTOP_APP_URL + '/#/VerifyPlatformEmployee?token=' + createdUser.verifyEmailText;
            NotificationService.addPlatformEmployee(entity.user.email, verificationLink, function(err) {
                cb(err, createdUser);
            });
        },
        function(createdUser, cb) {
            ActionRecordService.create({
                userId: authUser.id,
                businessName: DEFAULT_STRING,
                type: Const.ActionType.ADD_PLATFORM_ADMIN,
                details: createdUser.firstName + ' and ' + createdUser._id,
		metadata: createdUser
            }, function(err) {
                cb(err, createdUser);
            });
        }
    ], callback);
}

/**
 * After a platform admin is added by other platform admin a verification email is sent to the email
 * This method will verify the email
 * @param  {Object}     entity          request entity
 * @param  {Function}   callback        callback function
 */
function verifyPlatformAdmin(entity, callback) {
    var error = validate(
        {token: entity.token},
        {token: 'ShortString'});
    if (error) {
        return callback(error);
    }
    async.waterfall([
        function(cb) {
            User.findOne({
                verifyEmailText: entity.token
            }, cb);
        },
        function(user, cb) {
            if (!user) {
                return cb(new NotFoundError('User not found for given verification token'));
            }
            _.extend(user, {verifyEmailText: undefined, verifiedDate: new Date()});
            user.save(function(err, updatedUser) {
                cb(err, updatedUser);
            });
        },
        function(updatedUser, cb) {
            SecurityService.generateSessionToken(updatedUser._id, cb);
        }
    ], function(err, token) {
        if (err) {
            callback(err);
        } else {
            callback(null, {
                sessionToken: token
            });
        }
    });
}

/**
 * Update a platform employee
 * A platform employee can only update own profile profile information
 *
 * @param  {Object}     entity              request entity
 * @param  {Object}     authUser            current logged in user
 * @param  {Function}   callback            callback function
 */
function updatePlatformAdmin(entity, authUser, callback) {
    var error = validate(
        {lastName: entity.lastName, password: entity.password},
        {lastName: 'ShortString', password: 'ShortString'});
    if (error) {
        return callback(error);
    }
    async.waterfall([
        function(cb) {
            User.findById(authUser.id, cb);
        },
        function(user, cb) {
            if (!user) {
                return cb(new NotFoundError('User not found'));
            }
            SecurityService.generateHash(entity.password, function(err, hash) {
                cb(err, user, hash);
            });

        },
        function(user, hash, cb) {
            _.extend(user, {lastName: entity.lastName, passwordHash: hash});
            user.save(function(err) {
                cb(err);
            });
        }
    ], callback);
}

_.extend(module.exports, {
    getByEmail: logging.createWrapper(getByEmail, {
        input: ["email"],
        output: ["user"],
        signature: "UserService#getByEmail"
    }),
    getAll: logging.createWrapper(getAll, {
        input: [],
        output: ["users"],
        signature: "UserService#getAll"
    }),
    search: logging.createWrapper(search, {
        input: ["criteria"],
        output: ["users"],
        signature: "UserService#search"
    }),
    create: logging.createWrapper(create, {
        input: ["user"],
        output: ["user"],
        signature: "UserService#create"
    }),
    update: logging.createWrapper(update, {
        input: ["userId", "user"],
        output: ["user"],
        signature: "UserService#update"
    }),
    remove: logging.createWrapper(remove, {
        input: ["userId"],
        output: [],
        signature: "UserService#remove"
    }),
    getBySocialNetwork: logging.createWrapper(getBySocialNetwork, {
        input: ["socialNetwork", "linkedSocialNetworkUserId"],
        output: ["user"],
        signature: "UserService#getBySocialNetwork"
    }),
    getEmployees: logging.createWrapper(getEmployees, {
        input: ["businessId"],
        output: ["users"],
        signature: "UserService#getEmployees"
    }),
    get: logging.createWrapper(get, {
        input: ["userId"],
        output: ["user"],
        signature: "UserService#get"
    }),
    addPlatformAdmin: logging.createWrapper(addPlatformAdmin, {
        input: ["entity", "authUser"],
        output: ["user"],
        signature: "UserService#addPlatformAdmin"
    }),
    getAllPlatformAdmins: logging.createWrapper(getAllPlatformAdmins, {
        input: [],
        output: ["admins"],
        signature: "UserService#getAllPlatformAdmins"
    }),
    deletePlatformAdmin: logging.createWrapper(deletePlatformAdmin, {
        input: ["id", "entity", "authUser"],
        output: [],
        logInput: false,
        signature: "UserService#deletePlatformAdmin"
    }),
    updatePlatformAdmin: logging.createWrapper(updatePlatformAdmin, {
        input: ["entity", "authUser"],
        output: [],
        logInput: false,
        signature: "UserService#updatePlatformAdmin"
    }),
    verifyPlatformAdmin: logging.createWrapper(verifyPlatformAdmin, {
        input: ["entity"],
        output: ["token"],
        logInput: false,
        logOutput: false,
        signature: "UserService#verifyPlatformAdmin"
    })
});
