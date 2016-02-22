/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */
/**
 * This service provides methods to manage Gift cards.
 *
 * @version 1.7
 * @author TCSASSEMBLER
 *
 * Changes in 1.1:
 * 1. Add methods for GiftCard gifting
 * 2. Add _checkGiftCardRedeemed (exclude common code from redeem);
 *
 * Changes in 1.2:
 *  - Updated the business address logic.
 *  - Added parameter to search() method.
 *
 * Changes in 1.3:
 *  - Create readableId in gift cards
 *
 * Changes in 1.4:
 * - Add businessName property in ActionRecord
 * - Add businessWebsite property to GiftCard
 *
 * Changes in 1.5:
 * - Fix [PMP-177] Use same readableId for gifted gift card
 * - [PMP-189] Fix currentQRCode and oldQRCode fields of GiftCard
 *
 * Changes in 1.6 (Project Mom and Pop - MiscUpdate5):
 * - [PMP-206] Save target in ActionRecord metadata in giveGiftCard
 *
 * Changes in version 1.7 (Project Mom and Pop - Release Fall 2015 Assembly):
 * - [PMP-230] Email gift card to owner
 */
'use strict';

var _ = require('underscore');
var async = require('async');
var moment = require('moment');
var validate = require("../common/validator").validate;
var Const = require("../Const");
var logging = require("../common/logging");
var helper = require("../common/helper");
var BadRequestError = require("../common/errors").BadRequestError;
var ForbiddenError = require("../common/errors").ForbiddenError;
var NotFoundError = require("../common/errors").NotFoundError;
var GiftCard = require('../models').GiftCard;
var User = require('../models').User;
var GiftCardOffer = require('../models').GiftCardOffer;
var GiftCardGift = require('../models').GiftCardGift;
var ActionRecordService = require('./ActionRecordService');
var NotificationService = require('./NotificationService');


/**
 * Check if gift card is fully redeemed and set it as inactive
 * @param {String} giftCardId the gift card id
 * @param {function(Error, GiftCard)} callback the callback function with arguments
 * - the error
 * - the gift card
 * @private
 * @since 1.1
 */
function _checkGiftCardRedeemed(giftCardId, callback) {
    var result;
    async.waterfall([
        function (cb) {
            helper.ensureExists(GiftCard, giftCardId, cb);
        }, function (giftCard, cb) {
            result = giftCard;
            if (giftCard.quantity < 0.01) {//don't compare to 0, because of rounding errors
                giftCard.quantity = 0;
                giftCard.status = Const.GiftCardStatus.INACTIVE;
                giftCard.save(cb.errorOnly());
            } else {
                cb();
            }
        }
    ], function (err) {
        callback(err, result);
    });
}

/**
 * Get a gift card using a qr code
 * @param {String} qrCode the qr code
 * @param {ObjectId} businessId the expected owner of the gift card offer
 * @param {function(Error, GiftCard)} callback the callback function with arguments
 * - the error
 * - the gift card
 */
function getByQRCode(qrCode, businessId, callback) {
    var error = validate(
        {qrCode: qrCode, businessId: businessId},
        {qrCode: "ShortString", businessId: "ObjectId"});
    if (error) {
        return callback(error);
    }
    async.waterfall([
        function (cb) {
            GiftCard.findOne({
		$or: [
                    {currentQRCode: qrCode},
		    {oldQRCode: qrCode}
		]
            }, cb);
        }, function (giftCard, cb) {
            if (!giftCard) {
                return cb(new NotFoundError("QR Code is unknown or already redeemed."));
            }
            if (!_.compareObjectId(giftCard.businessId, businessId)) {
                return cb(new ForbiddenError("QR Code doesn't belong to your business."));
            }
            if (giftCard.status !== Const.GiftCardStatus.ACTIVE) {
                return cb(new BadRequestError('Gift card is not active.'));
            }
            cb(null, _.toJSON(giftCard));
        }
    ], callback);
}

/**
 * Redeem a gift card using a qr code
 * @param {String} qrCode the qr code
 * @param {Number} amount the amount to redeem
 * @param {ObjectId} businessId the expected owner of the gift card offer
 * @param {function(Error, GiftCard)} callback the callback function with arguments
 * - the error
 * - the redeemed gift card
 */
function redeem(qrCode, amount, businessId, callback) {
    var error = validate(
        {qrCode: qrCode, amount: amount, businessId: businessId},
        {qrCode: "ShortString", amount: {type: Number, min: 0.01}, businessId: "ObjectId"});
    if (error) {
        return callback(error);
    }
    amount = Math.floor(amount * 100) / 100;
    var result, giftCardId;
    async.waterfall([
        function (cb) {
            getByQRCode(qrCode, businessId, cb);
        }, function (giftCard, cb) {
            if (giftCard.quantity < amount) {
                return cb(new BadRequestError('Gift card quantity is not enough.'));
            }
            giftCardId = giftCard.id;
	    if (qrCode === giftCard.oldQRCode) {
		/* [PMP-189] Champion used a QRcode twice in a row.
		 * Don't update the currentQRCode. */
		GiftCard.update({
                    oldQRCode: qrCode
		}, {
                    $inc: {
			quantity: -amount
                    },
                    $push: {
			giftCardRedeems: {
                            amount: amount
			}
                    }
		}, cb);
	    } else {
		/* [PMP-189] Generate a new currentQRCode and save the
		 * old one to oldQRCode */
		var newQrCode = helper.randomString(Const.SAFE_RANDOM_LENGTH);
		//atomic update
		GiftCard.update({
                    currentQRCode: qrCode
		}, {
                    currentQRCode: newQrCode,
		    oldQRCode: qrCode,
                    $inc: {
			quantity: -amount
                    },
                    $push: {
			giftCardRedeems: {
                            amount: amount
			}
                    }
		}, cb);
	    }
        }, function (count, stats, cb) {
            if (count === 0) {
                return cb(new Error("Update failed for giftCard while redeem"));
            }
            _checkGiftCardRedeemed(giftCardId, cb);
        }, function (giftCard, cb) {
            result = giftCard;
            GiftCardOffer.findByIdAndUpdate(result.giftCardOfferId, {$inc: {redeemedQuantity: amount}}, cb.errorOnly());
        }, function (cb) {
            ActionRecordService.create({
                userId: result.ownerId,
                businessId: result.businessId,
                businessName: result.businessName,
                type: Const.ActionType.GIFT_CARD_REDEMPTION,
                amount: "$" + amount.toFixed(2),
                giftCardId: result.id,
                giftCardOfferId: result.giftCardOfferId
            }, cb);
        }
    ], function (err) {
        callback(err, _.toJSON(result));
    });
}

/**
 * Search gift cards with criteria
 * @param {BaseSearchCriteria} criteria the criteria
 * @param {String} [criteria.ownerId] the owner id to match
 * @param {String} [criteria.status] the gift card offer to match
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
                giftCardOfferId: "ObjectId?",

                ownerId: "ObjectId?",
                businessId: "ObjectId?",
                status: "GiftCardStatus?"
            }
        });
    if (error) {
        return callback(error);
    }
    var ret;
    async.waterfall([
        function (cb) {
            helper.paginationSearch(GiftCard, criteria, cb);
        }, function (result, cb) {
            ret = result;
            var ids = _.pluck(result.items, "id");
            GiftCardGift.find({sourceGiftCardId: {$in: ids},  status: Const.GiftCardGiftStatus.PENDING}, cb);
        }, function (gifts, cb) {
            var index = _.indexBy(gifts, "sourceGiftCardId");
            _.each(ret.items, function (giftCard) {
                if (index[giftCard.id]) {
                    giftCard.isGiftedToAnotherPerson = true;
                }
            });
            cb();
        }
    ], function (err) {
        callback(err, ret);
    });
}

/**
 * Give the gift card
 * @param {ObjectId} gifterId the user id who sends a gift
 * @param {String} giftCardId the gift card id being gifted
 * @param {Object} gift the gift values
 * @param {function(Error, GiftCardGift)} callback the callback function with arguments
 * - the error
 * - the created gift
 * @since 1.1
 */
function giveGiftCard(gifterId, giftCardId, gift, callback) {
    var error = validate(
        {gifterId: gifterId, giftCardId: giftCardId, gift: gift},
        {
            gifterId: "ObjectId",
            giftCardId: "ObjectId",
            gift: {
                __obj: true,
                quantity: {type: "Integer", min: 1},
                type: "GiftCardGiftType",
                metadata: {type: "AnyObject", required: false},
                isDelivered: "bool?"
            }
        });
    if (error) {
        return callback(error);
    }
    var quantity = gift.quantity;
    var giftCard, giftCardGift;
    async.waterfall([
        function (cb) {
            helper.ensureExists(GiftCard, giftCardId, cb);
        }, function (result, cb) {
            giftCard = result;
            if (!_.compareObjectId(giftCard.ownerId, gifterId)) {
                return cb(new ForbiddenError("Gift card doesn't belong to you"));
            }
            if (giftCard.quantity < quantity) {
                return cb(new BadRequestError('Gift card quantity is not enough.'));
            }

            GiftCard.update({
                _id: giftCardId,
                quantity: {$gte: quantity}
            }, {
                $inc: {
                    quantity: -quantity
                }
            }, cb);
        }, function (count, stats, cb) {
            if (count === 0) {
                return cb(new Error("Update failed for giftCard while gifting"));
            }
            GiftCardGift.create(_.extend({
                sourceGiftCardId: giftCardId,
                code: helper.randomString(Const.SAFE_RANDOM_LENGTH),
                status: Const.GiftCardGiftStatus.PENDING
            }, gift), cb);
        }, function (result, cb) {
            giftCardGift = result;
            _checkGiftCardRedeemed(giftCardId, cb);
        }, function (giftCard, cb) {
            ActionRecordService.create({
                userId: gifterId,
                businessId: giftCard.businessId,
                businessName: giftCard.businessName,
                type: Const.ActionType.GIFT_CARD_GIFTED,
                amount: "$" + quantity.toFixed(2),
                giftCardId: giftCard.id,
                giftCardOfferId: giftCard.giftCardOfferId,
		target: gift.metadata.target
            }, cb);
        }
    ], function (err) {
        callback(err, _.toJSON(giftCardGift));
    });
}

/**
 * Update the gift card gift
 * @param {ObjectId} giftId the gift card gift id
 * @param {Object} gift the values to update
 * @param {function(Error, GiftCardGift)} callback the callback function with arguments
 * - the error
 * - the updated gift
 * @since 1.1
 */
function updateGiftCardGift(giftId, gift, callback) {
    var error = validate(
        {giftId: giftId, gift: gift},
        {
            giftId: "ObjectId",
            gift: {
                __obj: true,
                targetGiftCardId: "ObjectId?",
                status: "GiftCardGiftStatus?",
                isDelivered: "bool?",
                messageId: "ShortString?"
            }
        });
    if (error) {
        return callback(error);
    }
    var existing;
    async.waterfall([
        function (cb) {
            helper.ensureExists(GiftCardGift, giftId, cb);
        }, function (result, cb) {
            existing = result;
            _.extend(existing, gift);
            existing.save(cb);
        }
    ], function (err) {
        callback(err, _.toJSON(existing));
    });
}

/**
 * Get gift card gift by message id
 * @param {String} messageId the message id
 * @param {function(Error, GiftCardGift)} callback the callback function with arguments
 * - the error
 * - the result or null if not found
 * @since 1.1
 */
function getGiftCardGiftByMessageId(messageId, callback) {
    var error = validate(
        {messageId: messageId},
        { messageId: "ShortString"});
    if (error) {
        return callback(error);
    }
    GiftCardGift.findOne({messageId: messageId}, callback);
}

/**
 * Accept gift
 * @param {String} userId the user id who will get that gift
 * @param {String} giftCode the code of the gift
 * @param {String} twitterUser the id of associated twitter user, required if type is TWITTER
 * @param {function(Error, GiftCard, GiftCardGift)} callback the callback function with arguments
 * - the error
 * - the new created gift card
 * - the accepted gift
 * @since 1.1
 */
function acceptGift(userId, giftCode, twitterUser, callback) {
    var error = validate(
        {giftCode: giftCode, userId: userId, twitterUser: twitterUser},
        {giftCode: "ShortString", userId: "ObjectId", twitterUser: "ShortString?"});
    if (error) {
        return callback(error);
    }
    var gift, giftCard, user, createdGiftCard;
    async.waterfall([
        function (cb) {
            helper.ensureExists(GiftCardGift, {code: giftCode}, cb);
        }, function (result, cb) {
            gift = result;
            if (gift.status === Const.GiftCardGiftStatus.ACCEPTED) {
                return cb(new BadRequestError("Gift is already accepted"));
            }
            if (gift.status === Const.GiftCardGiftStatus.EXPIRED) {
                return cb(new BadRequestError("Gift has expired at " + moment(gift.expiredAt).format("MMMM DD, YYYY @ hh:mm A")));
            }
            if (gift.status === Const.GiftCardGiftStatus.NOT_DELIVERED) {
                return cb(new BadRequestError("Gift has not been delivered or delivered after 24 hours."));
            }
            helper.ensureExists(GiftCard, gift.sourceGiftCardId, cb);
        }, function (result, cb) {
            giftCard = result;
            if (_.compareObjectId(giftCard.ownerId, userId)) {
                return cb(new BadRequestError("You can't accept your own gift."));
            }
            helper.ensureExists(User, userId, cb);
        }, function (result, cb) {
            user = result;
            if (gift.type === Const.GiftCardGiftType.TWITTER && gift.metadata.targetTwitterUser !== twitterUser) {
                return cb(new BadRequestError("This gift doesn't belong to you."));
            }
	    var readableId = giftCard.readableId;
            GiftCard.create(_.extend({
                ownerId: userId,
                readableId: readableId,
                originalQuantity: gift.quantity,
                quantity: gift.quantity,
                status: Const.GiftCardStatus.ACTIVE,
                currentQRCode: helper.randomString(Const.SAFE_RANDOM_LENGTH),
		oldQRCode: null,
                isGift: true,
                createdBy: userId,
                modifiedBy: userId
            }, _.pick(giftCard, "businessId", "businessName", "businessType", "businessStreetAddress", "businessCity", "businessState", "businessCountry", "businessZip",
                "businessTelephone", "businessPicture", "giftCardOfferId", "description", "discount", "businessWebsite")), cb);
        }, function (result, cb) {
            createdGiftCard = result;
            gift.status = Const.GiftCardGiftStatus.ACCEPTED;
            gift.isDelivered = true;//better force it to true
            gift.targetGiftCardId = createdGiftCard.id;
            gift.save(cb.errorOnly());
        }, function (cb) {
            ActionRecordService.create({
                userId: userId,
                businessId: giftCard.businessId,
                businessName: giftCard.businessName,
                type: Const.ActionType.GIFT_CARD_GIFT_ACCEPTED,
                amount: "$" + createdGiftCard.quantity.toFixed(2),
                giftCardId: giftCard.id,
                giftCardOfferId: giftCard.giftCardOfferId
            }, cb.errorOnly());
        }, function (cb) {
	    NotificationService.notifyUserOfAcceptedGiftCard(createdGiftCard, cb);
	}
    ], function (err) {
        callback(err, _.toJSON(createdGiftCard), _.toJSON(gift));
    });
}

/**
 * Get a gift card
 * @param {ObjectId} id the gift card id
 * @param {function(Error, GiftCard)} callback the callback function with arguments
 * - the error
 * - the gift card or null if not found
 */
function get(id, callback) {
    var error = validate(
        {id: id},
        {id: "ObjectId"});
    if (error) {
        return callback(error);
    }
    GiftCard.findById(id, function (err, result) {
        callback(err, _.toJSON(result));
    });
}

module.exports = {
    redeem: logging.createWrapper(redeem, {
        input: ["qrCode", "amount", "businessId"],
        output: ["giftCard"],
        signature: "GiftCardService#redeem"
    }),
    search: logging.createWrapper(search, {
        input: ["criteria"],
        output: ["result"],
        signature: "GiftCardService#search"
    }),
    get: logging.createWrapper(get, {
        input: ["id"],
        output: ["giftCard"],
        signature: "GiftCardService#get"
    }),
    getByQRCode: logging.createWrapper(getByQRCode, {
        input: ["qrCode", "businessId"],
        output: ["giftCard"],
        signature: "GiftCardService#getByQRCode"
    }),
    giveGiftCard: logging.createWrapper(giveGiftCard, {
        input: ["gifterId", "giftCardId", "gift"],
        output: ["giftCardGift"],
        signature: "GiftCardService#giveGiftCard"
    }),
    updateGiftCardGift: logging.createWrapper(updateGiftCardGift, {
        input: ["giftId", "gift"],
        output: ["giftCardGift"],
        signature: "GiftCardService#updateGiftCardGift"
    }),
    getGiftCardGiftByMessageId: logging.createWrapper(getGiftCardGiftByMessageId, {
        input: ["messageId"],
        output: ["giftCardGift"],
        signature: "GiftCardService#getGiftCardGiftByMessageId"
    }),
    acceptGift: logging.createWrapper(acceptGift, {
        input: ["userId", "giftCode", "twitterUser"],
        output: ["giftCard", "gift"],
        signature: "GiftCardService#acceptGift"
    })
};
