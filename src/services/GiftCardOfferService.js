/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */
/**
 * This service provides methods to manage Gift card offers.
 *
 * Changes in version 1.1:
 *  - Added renew() method.
 *  - Updated business address logic.
 *
 * Changes in version 1.2:
 *  - Create readableId in gift cards
 *  - Change max quantity to 2000
 *  - Remove "Purchased" text from action record details
 *
 * Changes in 1.3
 * - Add businessName property to ActionRecord
 * - Add businessWebsite property to GiftCardOffer and GiftCard
 *
 * Changes in 1.4:
 * - [PMP-189] fix currentQRCode and oldQRCode fields of GiftCard model
 *
 * Changes in 1.5 (Project Mom and Pop - Gift Card Offers Search and View):
 * - Add searchByDistance
 *
 * Changes in version 1.6 (Project Mom and Pop - MiscUpdate5):
 * - [PMP-206] GiftCardOffer#conditions is now a plain string
 * - [PMP-206] Inject platform conditions on get
 * - Fix missing ';' errors
 *
 * Changes in version 1.7 (Project Mom and Pop - Release Fall 2015 Assembly):
 * - [PMP-240] Search by keyword in businessName, businessDescription and offerDescription
 * - [PMP-240] Add businessDescription field to GiftCardOffer
 *
 * @version 1.7
 * @author TCSASSEMBLER
 */
'use strict';

var _ = require('underscore');
var async = require('async');
var config = require('config');
var validate = require("../common/validator").validate;
var braintree = require('braintree');
var Const = require("../Const");
var logging = require("../common/logging");
var helper = require("../common/helper");
var BadRequestError = require("../common/errors").BadRequestError;
var ForbiddenError = require("../common/errors").ForbiddenError;
var GiftCardOffer = require('../models').GiftCardOffer;
var GiftCardOfferComment = require('../models').GiftCardOfferComment;
var GiftCard = require('../models').GiftCard;
var Business = require('../models').Business;
var User = require('../models').User;
var moment = require('moment');
var ActionRecordService = require("./ActionRecordService");
var NotificationService = require("./NotificationService");
var BusinessService = require("./BusinessService");


/**
 * Check if business has permission to publish gift cards
 * @param {Business} business the business
 * @param {function(Error)} callback the callback function with arguments
 * - the error
 * @private
 */
function _checkCanPublish(business, callback) {
    if (!business.isVerified) {
        return callback(new BadRequestError("Cannot publish Gift Card. Your business is not verified by platform admin."));
    }
    if (!business.isVerificationFeePaid) {
        return callback(new BadRequestError("Cannot publish Gift Card. Your business hasn't paid the verification fee."));
    }
    if (business.isSubscriptionExpired) {
        return callback(new BadRequestError("Cannot publish Gift Card. Your subscription is expired."));
    }
    callback();
}

/**
 * Compute expiration date
 * @param {Date} activationDate the activation date
 * @param {Date} endDateTime the end date time
 * @param {function(Error, Date)} callback the callback function with arguments
 * - the error
 * - the expiration date
 * @private
 */
function _getExpirationDate(activationDate, endDateTime, callback) {
    var autoExpire = config.OFFER_EXPIRATION_DAYS * 1000 * 60 * 60 * 24;
    var expiration = activationDate.getTime() + autoExpire;
    if (endDateTime.getTime() < new Date().getTime()) {
        return callback(new BadRequestError("End date time must be future date."));
    }
    if (endDateTime) {
        expiration = Math.min(expiration, endDateTime.getTime());
    }
    if (expiration < new Date()) {
        return callback(new BadRequestError("Invalid activation date. Date cannot be older than 90 days."));
    }
    return callback(null, new Date(expiration));
}

/**
 * Create a gift Card Offer
 *
 * @param {Object} giftCardOffer the entity to create
 * @param {function(Error, Business)} callback the callback function with arguments
 * - the error
 * - the created object
 */
function create(giftCardOffer, callback) {
    var error = validate(
        {giftCardOffer: giftCardOffer},
        {
            giftCardOffer: {
                businessId: "ObjectId",
                discount: "Discount",
                activationDateTime: Date,
                endDateTime: "date",
                description: "ShortString",
                status: {type: "enum", "enum": [Const.GiftCardOfferStatus.ACTIVE, Const.GiftCardOfferStatus.DRAFT]},
                totalQuantity: "Integer >=0",
                conditions: "LongString?",
                createdBy: "ShortString",
                modifiedBy: "ShortString"
            }
        });
    if (error) {
        return callback(error);
    }
    var business;
    async.waterfall([
        function (cb) {
            helper.ensureExists(Business, giftCardOffer.businessId, cb);
        }, function (result, cb) {
            business = result;
            if (giftCardOffer.status === Const.GiftCardOfferStatus.ACTIVE) {
                _checkCanPublish(business, cb);
            } else {
                cb();
            }
        }, function (cb) {
            _getExpirationDate(giftCardOffer.activationDateTime, giftCardOffer.endDateTime, cb);
        }, function (expiration, cb) {
            _.extend(giftCardOffer, {
                availableQuantity: giftCardOffer.totalQuantity,
                expirationDate: expiration,
                businessId: business.id,
                businessName: business.name,
                businessDescription: business.description,
                businessType: business.type,
                businessStreetAddress: business.streetAddress,
                businessCity: business.city,
                businessState: business.state,
                businessCountry: business.country,
                businessZip: business.zip,
                businessTelephone: business.telephoneNumber,
                businessPicture: business.picture,
                businessWebsite: business.website,
                businessCoordinates: business.coordinates
            });
	    GiftCardOffer.create(giftCardOffer, cb);
        }
    ], function (err, result) {
        callback(err, _.toJSON(result));
    });
}

/**
 * Inserts the gift card offer conditions of the platform into a
 * GiftCardOffer object as platformConditions property.
 * @param {GiftCardOffer} [giftCardOffer] The offer
 */
function _injectPlatformConditions(giftCardOffer) {
    if (giftCardOffer) {
	giftCardOffer.platformConditions = config.BUSINESS_CONDITION;
    }
    return giftCardOffer;
}

/**
 * Get a gift Card Offer
 * @param {ObjectId} id the gift card offer id
 * @param {function(Error, GiftCardOffer)} callback the callback function with arguments
 * - the error
 * - the found object or null if not found
 */
function getById(id, callback) {
    var error = validate(
        {id: id},
        {id: "ObjectId"});
    if (error) {
        return callback(error);
    }
    GiftCardOffer.findById(id, function (err, result) {
        callback(err, _.toJSON(_injectPlatformConditions(result)));
    });
}

/**
 * Update a gift Card Offer
 *
 * @param {ObjectId} id the gift card offer id
 * @param {Object} giftCardOffer the values to update
 * @param {function(Error, GiftCardOffer)} callback the callback function with arguments
 * - the error
 * - the updated object
 */
function update(id, giftCardOffer, callback) {
    var error = validate(
        {id: id, giftCardOffer: giftCardOffer},
        {
            id: "ObjectId", giftCardOffer: {
            discount: "Discount?",
            activationDateTime: "date?",
            endDateTime: "date?",
            description: "ShortString?",
            status: {
                type: "enum",
                "enum": [Const.GiftCardOfferStatus.ACTIVE, Const.GiftCardOfferStatus.DRAFT, Const.GiftCardOfferStatus.ENDED],
                required: false
            },
	    conditions: "LongString?",
            totalQuantity: "Integer? >=0",
            modifiedBy: "ShortString"
        }
        });
    if (error) {
        return callback(error);
    }
    var existing, business;
    async.waterfall([
        function (cb) {
            helper.ensureExists(GiftCardOffer, id, cb);
        }, function (result, cb) {
            existing = result;
            // only DRAFT status gift cards can be updated
            if ((existing.status !== Const.GiftCardOfferStatus.DRAFT) &&
		(giftCardOffer.status && giftCardOffer.status !== Const.GiftCardOfferStatus.ENDED)) {
                return cb(new BadRequestError('Only DRAFT status gift card offers can be updated'));
            }
            helper.ensureExists(Business, existing.businessId, cb);
        }, function (result, cb) {
            business = result;
            if (giftCardOffer.status === Const.GiftCardOfferStatus.ACTIVE) {
                _checkCanPublish(business, cb);
            } else {
                cb();
            }
        }, function (cb) {
            giftCardOffer.availableQuantity = giftCardOffer.totalQuantity;
	    _.extend(existing, giftCardOffer);
            existing.modifiedOn = new Date();
            _getExpirationDate(existing.activationDateTime, existing.endDateTime, cb);
        }, function (expiration, cb) {
            giftCardOffer.expirationDate = expiration;
            existing.save(cb);
        }
    ], function (err) {
        callback(err, _.toJSON(existing));
    });
}

/**
 * Delete a giftCardOffer
 *
 * @param {ObjectId} id the gift card offer id
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
    helper.ensureExists(GiftCardOffer, id, callback.wrap(function (entity) {
        async.parallel([
            function (cb) {
		GiftCardOfferComment.remove({giftCardOfferId: id}, cb);
            }, function (cb) {
		entity.remove(cb);
            }, function (cb) {
                NotificationService.notifyUserOfRemoveOffer(entity, cb);
            }
        ], callback.errorOnly());
    }));
}

/**
 * Cancel a giftCardOffer
 *
 * @param {ObjectId} id the gift card offer id
 * @param {function(Error)} callback the callback function with arguments
 * - the error
 */
function cancel(id, callback) {
    var error = validate(
        {id: id},
        {id: "ObjectId"});
    if (error) {
        return callback(error);
    }
    async.waterfall([
        function (cb) {
            helper.ensureExists(GiftCardOffer, id, cb);
        }, function (giftCard, cb) {
            giftCard.status = Const.GiftCardOfferStatus.CANCELLED;
            giftCard.save(cb);
        }
    ], function (err, result) {
        callback(err, _.toJSON(result));
    });
}

/**
 * Renew the gift card offer.
 * @param giftCardOfferId the offer id.
 * @param callback the callback method
 * @returns {*} the result
 */
function renew(giftCardOfferId, callback) {
    var error = validate(
        {id: giftCardOfferId},
        {id: "ObjectId"});
    if (error) {
        return callback(error);
    }
    var existingItem = null;
    async.waterfall([
        function (cb) {
            helper.ensureExists(GiftCardOffer, giftCardOfferId, cb);
        }, function (giftCardOffer, cb) {
            existingItem = giftCardOffer;
            helper.ensureExists(Business, giftCardOffer.businessId, cb);
        }, function (business, cb) {
            if (business.isVerified !== true) {
                return cb(new BadRequestError('The business is not verified.'));
            }

            existingItem.status = Const.GiftCardOfferStatus.ACTIVE;
            existingItem.save(cb);
        }
    ], function (err, result) {
        callback(err, _.toJSON(result));
    });
}

/**
 * Search gift card offers with criteria
 * @param {BaseSearchCriteria} criteria the criteria
 * @param {String} [criteria.businessId] the business id to match
 * @param {String} [criteria.businessName] the business name to match (partial matching)
 * @param {String} [criteria.status] the gift card offer status to match
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

                businessId: "ObjectId?",
                ids: {type: ["ObjectId"], required: false},
                status: "GiftCardOfferStatus?",
                businessName: "ShortString?",
                businessType: "IntegerId?"
            }
        });
    if (error) {
        return callback(error);
    }

    var filter = _.omit(criteria, "ids", "businessName");
    if (criteria.businessName) {
	filter.$or = [
	    {businessName: criteria.businessName},
	    {businessDescription: criteria.businessName},
	    {description: criteria.businessName}
	];
	helper.makeRegexp(filter.$or[0], "businessName");
	helper.makeRegexp(filter.$or[1], "businessDescription");
	helper.makeRegexp(filter.$or[2], "description");
    }

    if (criteria.ids) {
        filter._id = {
            '$in': criteria.ids
        };
    }
    helper.paginationSearch(GiftCardOffer, filter, callback);
}


/**
 * Search gift card offers with criteria by distance
 * @param {BaseSearchCriteria} criteria the criteria
 * @param {Number} [criteria.lat] the longitude
 * @param {Number} [criteria.long] the latitude
 * @param {String} [criteria.businessName] the business name to match (partial matching)
 * @param {String} [criteria.status] the gift card offer status to match
 * @param {String} [criteria.businessType] the business type to match
 * @param {String} [criteria.sortByDiscount] true if sort by discount only, otherwise sort by activationDateTime, expirationDate, discount
 * @param {function(Error, PaginationResult)} callback the callback function with arguments
 * - the error
 * - the search result
 */
function searchWithCoordinates(criteria, callback) {
    var error = validate(
        {criteria: criteria},
        {
            criteria: {
                pageSize: "PageSize?",
                pageNumber: "PageNumber?",
                lat: Number,
                long: Number,
                businessId: "ObjectId?",
                status: "GiftCardOfferStatus?",
                businessName: "ShortString?",
                businessType: "IntegerId?",
                sortByDiscount: "Bool?"
            }
        });
    if (error) {
        return callback(error);
    }
    var offset = 0;
    var limit = 1e10;
    if (criteria.pageSize && criteria.pageNumber) {
        offset = (criteria.pageNumber - 1) * criteria.pageSize;
        limit = criteria.pageSize;
    }
    var sortByDiscount = criteria.sortByDiscount;
    var prev = 0;
    var distances = [];
    _.forEach(config.GIFT_OFFER_DISTANCE_SEARCH_RANGES, function (val) {
        distances.push({
            $minDistance: prev,
            $maxDistance: val
        });
        prev = val + 1;
    });
    distances.push({
        $minDistance: prev,
        $maxDistance: 1e10
    });
    //return always a copy
    var getBaseCriteria = function () {
        var ret = _.extend({
            businessCoordinates: {
                $near: {
                    $geometry: {
                        type: "Point" ,
                        coordinates: [criteria.long, criteria.lat]
                    }
                }
            }
        }, _.pick(criteria, "status", "businessType"));
	if (criteria.businessName) {
	    ret.$or = [
		{businessName: criteria.businessName},
		{businessDescription: criteria.businessName},
		{description: criteria.businessName}
	    ];
	    helper.makeRegexp(ret.$or[0], "businessName");
	    helper.makeRegexp(ret.$or[1], "businessDescription");
	    helper.makeRegexp(ret.$or[2], "description");
	}
        return ret;
    };

    var total = 0;
    var rangeCriteria = [];
    async.waterfall([
        //get count of gift card offers in every distance range
        function (cb) {
            async.map(distances, function (distance, cb) {
                var criteria = getBaseCriteria();
                _.extend(criteria.businessCoordinates.$near, distance);
                GiftCardOffer.count(criteria, cb);
            }, cb);
        },
        //compute intersection of offset/limit for each distance range
        function (counts, cb) {
            _.each(counts, function (count, i) {
                total += count;
                distances[i].count = count;
            });
            var currentOffset = 0;
            _.each(distances, function (distance) {
                // find intersection between ranges
                // offset : offset+limit
                // and
                // currentOffset : currentOffset+count
                if (distance.count && currentOffset <= offset + limit && currentOffset + distance.count >= offset) {
                    var rangeOffset = Math.max(0, offset - currentOffset);
                    rangeCriteria.push({
                        $minDistance: distance.$minDistance,
                        $maxDistance: distance.$maxDistance,
                        offset: rangeOffset,
                        limit: Math.min(distance.count, offset + limit - currentOffset)  - rangeOffset
                    });
                }
                currentOffset += distance.count;
            });
	    //get result from each range
            async.map(rangeCriteria, function (range, cb) {
                var criteria = getBaseCriteria();
                criteria.businessCoordinates.$near.$minDistance = range.$minDistance;
                criteria.businessCoordinates.$near.$maxDistance = range.$maxDistance;
                var sortBy = {
                    activationDateTime_floored: -1,
                    expirationDate_floored: 1,
                    discount: -1
                };
                if (sortByDiscount) {
                    sortBy = {
                        discount: -1
                    };
                }
		GiftCardOffer.find(criteria).skip(range.offset).limit(range.limit).sort(sortBy).exec(cb);
            }, cb);
        }
    ], function (err, items) {
        if (err) {
            return callback(err);
        }
        items = _.toJSON(_.flatten(items));
        _.each(items, function (item) {
            //compute distance in km
            //useful for manual verification
            item.distance = helper.getDistanceFromLatLonInKm(criteria.lat, criteria.long,
		item.businessCoordinates[1], item.businessCoordinates[0]).toFixed(2);
	    _injectPlatformConditions(item);
        });
        callback(null, {
            totalPages: criteria.pageSize ? Math.ceil(total / criteria.pageSize) : 1,
            pageNumber: criteria.pageNumber || 1,
            totalRecords: total,
            items: items
        });
    });
    
}

/**
 * Purchase the gift card offers that are in shopping cart
 * @param {ObjectId} userId the id of user who performs this action
 * @param {Array} shoppingCart the shopping card and payment information
 * @param {function(Error, GiftCard[])} callback the callback function with arguments
 * - the error
 * - the created gift cards
 */
function purchase(userId, shoppingCart, callback) {
    var error = validate(
        {userId: userId, shoppingCart: shoppingCart},
        {
            userId: "ObjectId",
            shoppingCart: [{
                paymentMethodNonce: "ShortString",
                giftCardOfferId: "ObjectId",
                quantity: {type: "Integer", min: 1, max: config.MAX_QUANTITY}
            }]
        });
    if (error) {
        return callback(error);
    }
    //disallow duplicated items
    var unique = _.uniq(_.pluck(shoppingCart, "giftCardOfferId"));
    if (unique.length !== shoppingCart.length) {
        return callback(new BadRequestError("Shopping card contains duplicated items"));
    }
    var gateway = braintree.connect(config.BRAINTREE_GATEWAY_CONFIG);
    var roundAmount = function (number) {
        return Number(number.toFixed(2));
    };
    var braintreeResult = {};
    async.waterfall([
        function (cb) {
            helper.ensureExists(User, userId, cb.errorOnly());
        }, function (cb) {
            //do precheck validation
            async.forEach(shoppingCart, function (item, cb) {
                async.waterfall([
                    function (cb) {
                        helper.ensureExists(GiftCardOffer, item.giftCardOfferId, cb);
                    }, function (offer, cb) {
                        if (offer.status !== Const.GiftCardStatus.ACTIVE) {
                            return callback(new BadRequestError("Cannot purchase non active offer. Offer id=" + offer.id));
                        }
                        if (offer.availableQuantity < item.quantity) {
                            return callback(new BadRequestError("Cannot purchase offer. Not enough quantity. Offer id=" + offer.id));
                        }
                        var percent = 1 - offer.discount / 100;
                        item.price = roundAmount(percent * item.quantity);
                        item.offer = offer;
                        helper.ensureExists(Business, item.offer.businessId, cb);
                    }, function (business, cb) {
                        item.business = business;
                        cb();
                    }
                ], cb);
            }, cb);
        }, function (cb) {
            var errors = [];
            var giftCards = [];
            var failedIds = [];
            async.forEach(shoppingCart, function (item, cb) {
                async.waterfall([
                    function (cb) {
                        // add .toFixed(2), without it number can be formatted as '3.7800000000000002'
                        gateway.transaction.sale({
                            merchantAccountId: item.business.braintreeAccountId,
                            amount: item.price.toFixed(2),
                            paymentMethodNonce: item.paymentMethodNonce,
                            serviceFeeAmount: roundAmount(0.029 * item.price + 0.3).toFixed(2),
                            options: {
                                submitForSettlement: true
                            }
                        }, cb);
                    }, function (result, cb) {
                        braintreeResult = result;
                        if (!result.success) {
                            logging.logError("Purchase failed GiftCardOffer: " + item.giftCardOfferId, result);
                            cb(new Error("Failed to create transaction: " + JSON.stringify(result.message)));
                            return;
                        }
                        //this is atomic update
                        GiftCardOffer.update({
                            _id: item.giftCardOfferId,
                            availableQuantity: {$gte: item.quantity}
                        }, {
                            $inc: {
                                availableQuantity: -item.quantity,
                                numberOfGiftCard: 1
                            }
                        }, cb);
                    }, function (count, result, cb) {
                        //2 parallel requests
                        if (count === 0) {
                            cb(new Error("Failed to decrement GiftCardOffer quantity: " + item.giftCardOfferId));
                            return;
                        }
                        GiftCardOffer.update({
                            _id: item.giftCardOfferId,
                            availableQuantity: 0
                        }, {
                            status: Const.GiftCardOfferStatus.ENDED
                        }, cb.errorOnly());
                    }, function (cb) {
                        BusinessService.getNextGiftCardReadableId(item.business.id, cb);
                    }, function (readableId, cb) {
                        GiftCard.create({
                            ownerId: userId,
                            readableId: readableId,

                            //business fields
                            businessId: item.business.id,
                            businessName: item.business.name,
                            businessType: item.business.type,
                            businessStreetAddress: item.business.streetAddress,
                            businessCity: item.business.city,
                            businessState: item.business.state,
                            businessCountry: item.business.country,
                            businessZip: item.business.zip,
                            businessTelephone: item.business.telephoneNumber,
                            businessPicture: item.business.picture,
                            businessWebsite: item.business.website,
                            businessCoordinates: item.business.coordinates,

                            //offer fields
                            giftCardOfferId: item.giftCardOfferId,
                            description: item.offer.description,
                            discount: item.offer.discount,

                            //card information
                            originalQuantity: item.quantity,
                            quantity: item.quantity,
                            currentQRCode: helper.randomString(Const.SAFE_RANDOM_LENGTH),
                            oldQRCode: null,
                            status: Const.GiftCardStatus.ACTIVE,
                            giftCardRedeems: [],

                            createdBy: userId,
                            modifiedBy: userId
                        }, cb);
                    }, function (giftCard, cb) {
                        giftCards.push(giftCard);
                        ActionRecordService.create({
                            userId: userId,
                            businessId: item.business.id,
                            businessName: item.business.name,
                            type: Const.ActionType.GIFT_CARD_PURCHASE,
                            amount: "$" + item.quantity.toFixed(2),
                            giftCardId: giftCard.id,
                            giftCardOfferId: giftCard.giftCardOfferId
                        }, cb);
                    }, function (result, cb) {
                        braintreeResult.transaction.businessName = item.business.name;
                        braintreeResult.transaction.createdAtText = moment(braintreeResult.transaction.createdAt).format("MMMM DD, YYYY hh:mm A");
                        //don't send email if this method is called from data generator
                        if (process.env.DATA_GENERATOR) {
                            return cb();
                        }
                        NotificationService.notifyUserOfReceipt(braintreeResult, userId, giftCards[0], cb);
                    }
                ], function (err) {
                    if (err) {
                        logging.logError("Error when purchase GiftCardOffer: " + item.giftCardOfferId, err);
                        errors.push(err);
                        failedIds.push(item.giftCardOfferId);
                    }
                    cb();
                });
            }, function () {
                if (errors.length) {
                    //log all errors
                    logging.logError("Purchase for user: " + userId, errors);
                    if (giftCards.length) {
                        //some offers were successful and some not
                        cb(new Error("Failed to purchase offers: " + failedIds.join(", ") + ". Please contact administrator."));
                    } else {
                        //if failed to create all gift card offers it means user might have an incorrect credit card
                        cb(new Error("Failed to purchase. Please check your credit card information."));
                    }
                } else {
                    cb(null, giftCards);
                }
            });
        }
    ], callback);
}

/**
 * Add comment to gift card offer
 * @param {Object} comment the comment to create
 * @param {function(Error, GiftCardOfferComment)} callback the callback function with arguments
 * - the error
 * - the created comment
 */
function addComment(comment, callback) {
    var error = validate(
        {comment: comment},
        {
            comment: {
                giftCardOfferId: "ObjectId",
                userId: "ObjectId",
                username: "ShortString",
                comment: "ShortString"
            }
        });
    if (error) {
        return callback(error);
    }
    async.waterfall([
        function (cb) {
            async.parallel([
                function (cb) {
                    helper.ensureExists(GiftCardOffer, comment.giftCardOfferId, cb);
                }, function (cb) {
                    helper.ensureExists(User, comment.userId, cb);
                }
            ], cb.errorOnly());
        }, function (cb) {
            GiftCardOfferComment.create(comment, cb);
        }
    ], function (err, result) {
        callback(err, _.toJSON(result));
    });
}

/**
 * Remove a comment from gift card offer
 * @param {Object} commentId the comment id to delete
 * @param {Object} businessId the business who performs this operation
 * @param {function(Error)} callback the callback function with arguments
 * - the error
 */
function removeComment(commentId, businessId, callback) {
    var error = validate(
        {commentId: commentId, businessId:  businessId},
        {commentId: "ObjectId", businessId: "ObjectId"});
    if (error) {
        return callback(error);
    }
    var comment;
    async.waterfall([
        function (cb) {
            helper.ensureExists(GiftCardOfferComment, commentId, cb);
        }, function (result, cb) {
            comment = result;
            helper.ensureExists(GiftCardOffer, comment.giftCardOfferId, cb);
        }, function (offer, cb) {
            if (!_.compareObjectId(offer.businessId, businessId)) {
                return callback(new ForbiddenError("You are not allowed to perform this operation"));
            }
            comment.remove(cb);
        }, function (result, cb) {
            NotificationService.notifyUserOfRemoveComment(comment, comment.userId, cb);
        }
    ], callback.errorOnly());
}

/**
 * Get comments for a gift card offer
 * @param {Object} giftCardOfferId the id of gift card offer
 * @param {function(Error, GiftCardOfferComment[])} callback the callback function with arguments
 * - the error
 * - the comments
 */

function getComments(giftCardOfferId, callback) {
    var error = validate(
        {giftCardOfferId: giftCardOfferId},
        {giftCardOfferId: "ObjectId"});
    if (error) {
        return callback(error);
    }
    async.waterfall([
        function (cb) {
            helper.ensureExists(GiftCardOffer, giftCardOfferId, cb.errorOnly());
        }, function (cb) {
            GiftCardOfferComment.find({giftCardOfferId: giftCardOfferId}, cb);
        }
    ], callback);
}

/**
 * Get braintree token.
 * @param {function(Error, String)} callback the callback function with arguments
 * - the error
 * - the token
 */
function getBraintreeToken(callback) {
    var gateway = braintree.connect(config.BRAINTREE_GATEWAY_CONFIG);
    gateway.clientToken.generate({}, callback.wrap(function (response) {
        if (!response && !response.success) {
            return callback(new Error('Cannot get braintree token.'));
        }
        callback(null, response.clientToken);
    }));
}

/**
 * Add the view count.
 * @param giftCardOfferId the gift card offer id
 * @param callback the callback method.
 */
function increaseViewCount(giftCardOfferId, callback) {
    var error = validate(
        {id: giftCardOfferId},
        {id: "ObjectId"});
    if (error) {
        return callback(error);
    }
    async.waterfall([
        function (cb) {
            helper.ensureExists(GiftCardOffer, giftCardOfferId, cb);
        }, function (giftCardOffer, cb) {
            giftCardOffer.viewCount = giftCardOffer.viewCount + 1;
            giftCardOffer.save(cb);
        }
    ], callback.errorOnly());
}

/**
 * Add the shared count.
 * @param giftCardOfferId the gift card offer id.
 * @param callback the callback method.
 */
function increaseSharedCount(giftCardOfferId, callback) {
    var error = validate(
        {id: giftCardOfferId},
        {id: "ObjectId"});
    if (error) {
        return callback(error);
    }
    async.waterfall([
        function (cb) {
            helper.ensureExists(GiftCardOffer, giftCardOfferId, cb);
        }, function (giftCardOffer, cb) {
            giftCardOffer.sharedCount = giftCardOffer.sharedCount + 1;
            giftCardOffer.save(cb);
        }
    ], callback.errorOnly());
}

module.exports = {
    create: logging.createWrapper(create, {
        input: ["giftCardOffer"],
        output: ["giftCardOffer"],
        signature: "GiftCardOfferService#create"
    }),
    getById: logging.createWrapper(getById, {
        input: ["id"],
        output: ["giftCardOffer"],
        signature: "GiftCardOfferService#getById"
    }),
    update: logging.createWrapper(update, {
        input: ["id", "giftCardOffer"],
        output: ["giftCardOffer"],
        signature: "GiftCardOfferService#update"
    }),
    remove: logging.createWrapper(remove, {input: ["id"], output: [], signature: "GiftCardOfferService#remove"}),
    cancel: logging.createWrapper(cancel, {
        input: ["id"],
        output: ["giftCardOffer"],
        signature: "GiftCardOfferService#cancel"
    }),
    renew: logging.createWrapper(renew, {
        input: ["id"],
        output: ["giftCardOffer"],
        signature: "GiftCardOfferService#renew"
    }),
    search: logging.createWrapper(search, {
        input: ["criteria"],
        output: ["results"],
        signature: "GiftCardOfferService#search"
    }),
    searchWithCoordinates: logging.createWrapper(searchWithCoordinates, {
        input: ["criteria"],
        output: ["results"],
        signature: "GiftCardOfferService#searchWithCoordinates"
    }),
    purchase: logging.createWrapper(purchase, {
        input: ["userId", "shoppingCart"],
        output: ["giftCards"],
        signature: "GiftCardOfferService#purchase"
    }),
    addComment: logging.createWrapper(addComment, {
        input: ["comment"],
        output: ["comment"],
        signature: "GiftCardOfferService#addComment"
    }),
    removeComment: logging.createWrapper(removeComment, {
        input: ["commentId", "businessId"],
        output: [],
        signature: "GiftCardOfferService#removeComment"
    }),
    getComments: logging.createWrapper(getComments, {
        input: ["giftCardOfferId"],
        output: ["comments"],
        signature: "GiftCardOfferService#getComments"
    }),
    increaseViewCount: logging.createWrapper(increaseViewCount, {
        input: ["giftCardOfferId"],
        output: [],
        signature: "GiftCardOfferService#increaseViewCount"
    }),
    increaseSharedCount: logging.createWrapper(increaseSharedCount, {
        input: ["giftCardOfferId"],
        output: [],
        signature: "GiftCardOfferService#increaseSharedCount"
    }),
    getBraintreeToken: logging.createWrapper(getBraintreeToken, {
        input: [],
        output: ["token"],
        signature: "GiftCardOfferService#getBraintreeToken"
    })
};
