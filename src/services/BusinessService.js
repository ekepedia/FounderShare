/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */
/**
 * This service provides methods to manage Business.
 *
 * Changes in version 1.1:
 *  - Updated the business address logic.
 *
 * Changes in version 1.2:
 *  - add getNextGiftCardReadableId
 *
 * Changes in version 1.3 (Project Mom and Pop - MiscUpdate5):
 *  - [PMP-206] remove Business#confitions field
 *
 * @version 1.3
 * @author TCSASSEMBLER
 */
'use strict';

var _ = require('underscore');
var async = require('async');
var config = require('config');
var braintree = require("braintree");
var validate = require("../common/validator").validate;
var logging = require("../common/logging");
var helper = require("../common/helper");
var BadRequestError = require("../common/errors").BadRequestError;
var Business = require('../models').Business;
var BusinessType = require('../models').BusinessType;
var GiftCardOffer = require('../models').GiftCardOffer;
var GiftCard = require('../models').GiftCard;
var Geocoder = require('node-geocoder');

var geocoder = Geocoder.getGeocoder(config.GEOCODER_PROVIDER, config.GEOCODER_HTTPADAPTER, {});

/**
 * Get coordinates from address
 * @param {String} address the address
 * @param {function(Error, Array)} callback the callback function with arguments
 * - the error
 * - the array with coordinates
 * @private
 */
function _fetchCoordinates(address, callback) {
    geocoder.geocode(address, callback.wrap(function (result) {
        if (!result.length) {
            return callback(new BadRequestError("Invalid address or unknown location"));
        } else if (result.length > 1) {
            return callback(new BadRequestError("Ambiguous address or unknown location"));
        }
        callback(null, [result[0].longitude, result[0].latitude]);
    }));
}

/**
 * Create a business.
 * @param {Business} business the business
 * @param {function(Error, Business)} callback the callback function with arguments
 * - the error
 * - the created object
 */
function create(business, callback) {
    var error = validate(
        {business: business},
        {
            business: {
                __obj: true,
                name: "ShortString?",
                type: "IntegerId?",
                streetAddress: "ShortString?",
                city: "ShortString?",
                state: "ShortString?",
                country: "ShortString?",
                zip: "ShortString?",
                telephoneNumber: "ShortString?",
                picture: "ShortString?",
                businessHours: "ShortString?",
                description: "ShortString?",
                website: "url?",
                isVerified: "bool?",
                isSubscriptionExpired: "bool?",
                isVerificationFeePaid: "bool?",
                braintreeAccountId: "ShortString?",
                notificationDate: "date?"
            }
        });
    if (error) {
        return callback(error);
    }
    async.waterfall([
        function (cb) {
            if (business.type) {
                helper.ensureExists(BusinessType, business.type, cb.errorOnly());
            } else {
                cb();
            }
        }, function (cb) {
            if (business.streetAddress) {
                var address = business.streetAddress + ' ' + business.city + ', ' + business.state + ' ' + business.country + ' ' + business.zip;
                _fetchCoordinates(address, cb.wrap(function (coordinates) {
                    business.coordinates = coordinates;
                    cb();
                }));
            } else {
                cb();
            }
        }, function (cb) {
            Business.create(business, cb);
        }
    ], function (err, result) {
        callback(err, _.toJSON(result));
    });
}

/**
 * Get a business.
 * @param id {String} the business id
 * @param {function(Error, Business)} callback the callback function with arguments
 * - the error
 * - the found object or null if not found
 */
function get(id, callback) {
    var error = validate(
        {id: id},
        {id: "ObjectId"});
    if (error) {
        return callback(error);
    }
    Business.findById(id).exec(function (err, result) {
        callback(err, _.toJSON(result));
    });
}


/**
 * Update business.
 * @param {ObjectId} id the business id
 * @param {Business} business the values to update
 * @param {function(Error, Business)} callback the callback function with arguments
 * - the error
 * - the updated object
 */
function update(id, business, callback) {
    var error = validate(
        {id: id, business: business},
        {
            id: "ObjectId", business: {
            __obj: true,
            name: "ShortString?",
            type: "IntegerId?",
            streetAddress: "ShortString?",
            city: "ShortString?",
            state: "ShortString?",
            country: "ShortString?",
            zip: "ShortString?",
            telephoneNumber: "ShortString?",
            picture: "ShortString?",
            businessHours: "ShortString?",
            description: "ShortString?",
            website: "url?",
            isVerified: "bool?",
            isSubscriptionExpired: "bool?",
            isVerificationFeePaid: "bool?",
            braintreeAccountId: "ShortString?",
            notificationDate: "date?"
        }
        });
    if (error) {
        return callback(error);
    }
    var existing;
    async.waterfall([
        function (cb) {
            helper.ensureExists(Business, id, cb);
        }, function (result, cb) {
            existing = result;
            if (business.type) {
                helper.ensureExists(BusinessType, business.type, cb.errorOnly());
            } else {
                cb();
            }
        }, function (cb) {
            var address = business.streetAddress + ' ' + business.city + ', ' + business.state + ' ' + business.country + ' ' + business.zip;
            var existingAddress = existing.streetAddress + ' ' + existing.city + ', ' + existing.state + ' ' + existing.country + ' ' + existing.zip;
            if (existingAddress !== address && business.streetAddress) {
                _fetchCoordinates(address, cb.wrap(function (coordinates) {
                    business.coordinates = coordinates;
                    cb();
                }));
            } else {
                cb();
            }
        }, function (cb) {
            _.extend(existing, business);
            existing.save(cb.errorOnly());
        }, function (cb) {
            var existingAddress = existing.streetAddress + ' ' + existing.city + ', ' + existing.state + ' ' + existing.country + ' ' + existing.zip;
            var updateValues = {
                businessName: existing.name,
                businessType: existing.type,
                businessAddress: existingAddress,
                businessTelephone: existing.telephoneNumber,
                businessPicture: existing.picture
            };
            async.parallel([
                function (cb) {
                    GiftCard.update({businessId: id}, updateValues, {multi: true}, cb);
                }, function (cb) {
                    GiftCardOffer.update({businessId: id}, updateValues, {multi: true}, cb);
                }
            ], cb);
        }
    ], function (err) {
        callback(err, _.toJSON(existing));
    });
}

/**
 * Delete business.
 * @param {ObjectId} id the business id
 * @param {function(Error)} callback the callback function with arguments
 * - the error
 */
function remove(id, callback) {
    var error = validate(
        {id: id},
        {id: "ObjectId"});
    if (error) {
        return callback(error);
    }

    var business;
    async.waterfall([
        function (cb) {
            helper.ensureExists(Business, id, cb);
        }, function (result, cb) {
            business = result;
            async.parallel({
                offers: function (cb) {
                    GiftCardOffer.find({businessId: id}, cb);
                },
                giftCards: function (cb) {
                    GiftCard.find({businessId: id}, cb);
                }
            }, cb);
        }, function (results, cb) {
            if (results.offers.length) {
                return cb(new BadRequestError('Cannot delete Business with id: ' + id + '. Business has active gift card offers.'));
            }
            if (results.giftCards.length) {
                return cb(new BadRequestError('Cannot delete Business with id: ' + id + '. Business has active gift cards.'));
            }
            business.remove(cb);
        }
    ], callback.errorOnly());
}

/**
 * Search businesses with criteria.
 * @param {BaseSearchCriteria} criteria the criteria
 * @param {String} [criteria.businessName] the business name to match (partial matching)
 * @param {ObjectId[]} [criteria.ids] the object ids to match
 * @param {function(Error, PaginationResult)} callback the callback function with arguments
 * - the error
 * - the search result
 */
function search(criteria, callback) {
    var error = validate(
        {criteria: criteria},
        {
            criteria: {
                pageSize: "PageSize?",
                pageNumber: "PageNumber?",
                sortBy: "ShortString?",
                sortOrder: "SortOrder?",
                businessName: "ShortString?",
                ids: {type: ["ObjectId"], required: false}
            }
        });
    if (error) {
        return callback(error);
    }
    var filter = _.omit(criteria, 'businessName', 'ids');

    if (criteria.businessName) {
        filter.name = {
            '$regex': criteria.businessName,
            '$options': 'i'
        };
    }

    if (criteria.ids) {
        filter._id = {
            $in: criteria.ids
        };
    }
    helper.paginationSearch(Business, filter, function (err, result) {
        callback(err, _.toJSON(result));
    });
}

/**
 * Verify business by paying a fee.
 * @param {Object} businessId the business id
 * @param {Object} merchantAccountParams the merchant account params
 * See here https://developers.braintreepayments.com/javascript+node/reference/request/merchant-account/create
 * @param {Object} paymentInfo the credit card
 * @param {Object} paymentInfo.firstName the first name
 * @param {Object} paymentInfo.lastName the last name
 * @param {Object} paymentInfo.paymentMethodNonce the payment verification token
 * @param {function(Error, Business)} callback the callback function with arguments
 * - the error
 * - the business
 */
function payForVerification(businessId, merchantAccountParams, paymentInfo, callback) {
    var error = validate(
        {businessId: businessId, merchantAccountParams: merchantAccountParams, paymentInfo: paymentInfo},
        {
            businessId: "ObjectId", merchantAccountParams: {__strict: false}, paymentInfo: {
            firstName: "ShortString",
            lastName: "ShortString",
            paymentMethodNonce: "ShortString"
        }
        });
    if (error) {
        return callback(error);
    }
    var gateway = braintree.connect(config.BRAINTREE_GATEWAY_CONFIG);
    merchantAccountParams.tosAccepted = true;
    merchantAccountParams.masterMerchantAccountId = config.BRAINTREE_MERCHANT_ACCOUNT_ID;
    var business;

    async.waterfall([
        function (cb) {
            helper.ensureExists(Business, businessId, cb);
        }, function (result, cb) {
            business = result;
            if (business.isVerificationFeePaid) {
                return cb(new BadRequestError("Verification fee is already paid"));
            }
            gateway.merchantAccount.create(merchantAccountParams, cb);
        }, function (result, cb) {
            if (result.success) {
                business.braintreeAccountId = result.merchantAccount.id;
                cb();
            } else {
                logging.logError("Failed to create merchant account", result);
                cb(new Error(result.message));
            }
        }, function (cb) {
            gateway.customer.create(paymentInfo, cb);
        }, function (result, cb) {
            if (result.success) {
                var subscriptionRequest = {
                    paymentMethodToken: result.customer.creditCards[0].token,
                    planId: config.BRAINTREE_SUBSCRIPTION_PLANID
                };
                gateway.subscription.create(subscriptionRequest, cb);
            } else {
                logging.logError("Failed to create customer", result);
                cb(new Error(result.message));
            }
        },
        function (result, cb) {
            if (result.success) {
                business.isVerificationFeePaid = true;
                business.verificationDate = new Date().getTime();
                business.subscriptionId = result.subscription.id;
                business.save(cb);
            } else {
                logging.logError("Failed to create subscription", result);
                cb(new Error(result.message));
            }
        }
    ], function (err) {
        callback(err, _.toJSON(business));
    });

}

/**
 * Get Business by braintreeAccountId.
 * @param {String} id the braintreeAccountId
 * @param {function(Error, Business)} callback the callback function with arguments
 * - the error
 * - the found object or null if not found
 */
function getByBraintreeAccountId(id, callback) {
    var error = validate(
        {id: id},
        {id: "ShortString"});
    if (error) {
        return callback(error);
    }
    helper.ensureExists(Business, {braintreeAccountId: id}, callback.wrap(function (result) {
        callback(null, _.toJSON(result));
    }));
}

function getBySubscriptionId(id, callback) {
    var error = validate(
        {id: id},
        {id: "ShortString"});
    if (error) {
        return callback(error);
    }
    helper.ensureExists(Business, {subscriptionId: id}, callback.wrap(function (result) {
        callback(null, _.toJSON(result));
    }));
}

/**
 * Generate next readable id for gift card
 * @param {String} businessId the business id
 * @param {function(Error, String)} callback the callback function with arguments
 * - the error
 * - the generated id
 * @since 1.2
 */
function getNextGiftCardReadableId(businessId, callback) {
    var business;
    async.waterfall([
        function (cb) {
            helper.ensureExists(Business, businessId, cb);
        }, function (result, cb) {
            business = result;
            Business.findByIdAndUpdate(businessId, {
                $inc: {
                    giftCardSeq: 1
                }
            }, {new: true}, cb);
        }, function (doc, cb) {
            var id = business.name.toUpperCase().replace(/ /g, "_") + "_" + doc.giftCardSeq;
            cb(null, id);
        }
    ], callback);
}

//
///**
// *
// * @param payload
// * @param callback
// */
//function parseWebhookNotification(btSignature, btPayload, callback) {
//    var gateway = braintree.connect(config.BRAINTREE_GATEWAY_CONFIG);
//    async.waterfall([
//        function(cb) {
//            //reference: https://www.braintreepayments.com/docs/node/subscriptions/details
//            //https://www.braintreepayments.com/docs/ruby/guide/webhook_notifications
//            gateway.webhookNotification.parse(btSignature, btPayload, cb);
//        },
//        function(webhookNotification, cb) {
//            if (webhookNotification.kind === braintree.WebhookNotification.Kind.SubscriptionCanceled ||
//                webhookNotification.kind === braintree.WebhookNotification.Kind.SubscriptionChargedUnsuccessfully ||
//                webhookNotification.kind === braintree.WebhookNotification.Kind.SubscriptionExpired) {
//                getByAccountId(webhookNotification.subscription.id, cb);
//            } else {
//                cb(new Error("Not supported kind: " + webhookNotification.kind));
//            }
//        },
//        function(existing, cb) {
//            if (!existing) {
//                return cb(new NotFoundError('No business with the hooked braintree account id'));
//            }
//            existing.isSubscriptionExpired = true;
//            update()
//            if (business) {
//                _.extend(business, {
//                    isSubscriptionExpired: true
//                });
//                business.save(function(err, business) {
//                    cb(err, business);
//                });
//            } else {
//                cb();
//            }
//        }
//    ], function(err, business) {
//        if (business) {
//            logger.info('Business subscription updated ' + JSON.stringify(business));
//        }
//        callback(err);
//    });
//}

module.exports = {
    create: logging.createWrapper(create, {
        input: ["business"],
        output: ["business"],
        signature: "BusinessService#create"
    }),
    get: logging.createWrapper(get, {input: ["id"], output: ["business"], signature: "BusinessService#get"}),
    update: logging.createWrapper(update, {
        input: ["id", "business"],
        output: ["business"],
        signature: "BusinessService#update"
    }),
    delete: logging.createWrapper(remove, {input: ["id"], output: [], signature: "BusinessService#remove"}),
    search: logging.createWrapper(search, {
        input: ["criteria"],
        output: ["results"],
        signature: "BusinessService#search"
    }),
    getByBraintreeAccountId: logging.createWrapper(getByBraintreeAccountId, {
        input: ["id"],
        output: ["business"],
        signature: "BusinessService#getByBraintreeAccountId"
    }),
    getBySubscriptionId: logging.createWrapper(getBySubscriptionId, {
        input: ["id"],
        output: ["business"],
        signature: "BusinessService#getBySubscriptionId"
    }),
    payForVerification: logging.createWrapper(payForVerification, {
        input: ["businessId", "merchantAccountParams", "paymentInfo"],
        output: ['business'],
        signature: "BusinessService#payForVerification"
    }),
    getNextGiftCardReadableId: logging.createWrapper(getNextGiftCardReadableId, {
        input: ["businessId"],
        output: ['id'],
        signature: "BusinessService#getNextGiftCardReadableId"
    })
};
