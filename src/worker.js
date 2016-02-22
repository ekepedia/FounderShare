/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */

/**
 * This is the background worker.
 *
 * Changes in version 1.1:
 *  - Added checkExpiredUserEmail() and checkExpiredGiftCardOffersJob() method.
 *
 * Changes in version 1.2 (Aug-30-2015):
 *  - checkExpiredUserEmail is commented out
 *  - updated checkExpiredGiftCardOffersJob to avoid a validation error with endDateTime
 * @author nikolay83
 * @version 1.2
 *
 * Changes in version 1.3:
 *  - Use custom logger instead of default winston logger
 *  - Remove require that was never used
 *
 * Changes in version 1.4 (Project Mom and Pop - MiscUpdate5):
 *  - [PMP-209] Fix issue in checkExpiredGiftCardOffersJob
 *
 * @author TCSASSEMBLER
 * @version 1.4
 * 
 */
"use strict";

var config = require('config');
var async = require('async');
var moment = require('moment');
var logging = require("./common/logging");
var logger = logging.logger;
var helper = require("./common/helper");
var Const = require("./Const");
var GiftCard = require('./models').GiftCard;
var User = require('./models').User;
var GiftCardGift = require('./models').GiftCardGift;
var GiftCardOffer = require('./models').GiftCardOffer;
var NotificationService = require("./services/NotificationService");
var GiftCardOfferService = require("./services/GiftCardOfferService");
var twilioClient = require('twilio')(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);

/**
 * Cancel the gift, notify owner and return quantity to original gift card
 * @param {Object} gift the gift
 * @param {String} type the type
 * @param {Function} callback the callback function
 * @private
 */
function _cancelGift(gift, type, callback) {
    async.parallel([
        //mark as expired
        function (cb) {
            if (type === "expired") {
                gift.status = Const.GiftCardGiftStatus.EXPIRED;
                gift.expiredAt = new Date();
            } else {
                gift.status = Const.GiftCardGiftStatus.NOT_DELIVERED;
            }
            gift.save(cb);
        },
        //send email to gifter
        function (cb) {
            var giftCard;
            async.waterfall([
                function (cb) {
                    helper.ensureExists(GiftCard, gift.sourceGiftCardId, cb);
                }, function (result, cb) {
                    giftCard = result;
                    helper.ensureExists(User, giftCard.ownerId, cb);
                }, function (user, cb) {
                    if (!user.email) {
                        return cb();
                    }
                    var values = {
                        resendUrl: config.DESKTOP_APP_URL + "#/FounderF$Gifting/" + gift.sourceGiftCardId,
                        firstName: user.firstName,
                        recipient: gift.metadata.target,
                        amount: gift.quantity.toFixed(2),
                        business: giftCard.businessName,
                        dateSent: moment(gift.createdAt).format("MMMM DD, YYYY @ hh:mm A")
                    };
                    var templateName;
                    if (type === "expired") {
                        templateName = "gift-expired";
                    } else {
                        templateName = "gift-not-delivered";
                    }
                    NotificationService.sendEmail(user.email, templateName, values, cb);
                }
            ], cb);
        },
        //add quantity to source GiftCard
        function (cb) {
            GiftCard.findByIdAndUpdate(gift.sourceGiftCardId, {
                $inc: {
                    quantity: gift.quantity
                },
                status: Const.GiftCardStatus.ACTIVE
            }, cb);
        }
    ], callback.errorOnly());
}

/**
 * Check if gifts have expired
 */
function checkExpiredGiftsJob() {
    var date = new Date().getTime() - config.GIFT_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;
    date = new Date(date);
    async.waterfall([
        function (cb) {
            GiftCardGift.find({
                createdAt: {
                    $lte: date
                },
                isDelivered: true,
                status: Const.GiftCardGiftStatus.PENDING
            }, cb);
        }, function (gifts, cb) {
            async.forEach(gifts, function (gift, cb) {
                logger.info("Gift expired " + gift.id);
                _cancelGift(gift, "expired", function (err) {
                    if (err) {
                        logging.logError("checkExpiredGifts, gift#" + gift.id, err);
                    }
                    cb();
                });
            }, cb);
        }
    ], function (err) {
        if (err) {
            logging.logError("checkExpiredGifts", err);
        }
        setTimeout(checkExpiredGiftsJob, config.JOB_GIFTS_INTERVAL);
    });
}

/**
 * Checks and removes the expired user emails.
 */

// as per Tammy's agreement cleaning up the unverified accounts is not needed now
/*
function checkExpiredUserEmail() {
    var date = new Date().getTime() - config.USER_EMAIL_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;
    date = new Date(date);
    async.waterfall([
        function (cb) {
            User.find({
                verifyEmailExpirationDate: {
                    $lte: date
                },
                verifyEmailText: {$ne:null}
            }, cb);
        }, function (users, cb) {
            async.forEach(users, function (user, cb) {
                logger.info("User removed:" + user.id);
                UserService.remove(user.id, cb);
            }, cb);
        }
    ], function (err) {
        if (err) {
            logging.logError("checkExpiredUserEmail", err);
        }
        setTimeout(checkExpiredUserEmail, config.USER_EMAIL_VERIFIED_INTERVAL);
    });
}
*/

/**
 * Check if gifts have not been delivered
 */
function checkNotDeliveredGiftsJob() {
    var date = new Date().getTime() - config.GIFT_DELIVERED_DAYS * 24 * 60 * 60 * 1000;
    date = new Date(date);
    async.waterfall([
        function (cb) {
            GiftCardGift.find({
                createdAt: {
                    $lte: date
                },
                isDelivered: false,
                status: Const.GiftCardGiftStatus.PENDING
            }, cb);
        }, function (gifts, cb) {
            async.forEach(gifts, function (gift, cbOuter) {
                async.waterfall([
                    function (cb) {
                        if (!gift.messageId || gift.type !== Const.GiftCardGiftType.PHONE_NUMBER) {
                            return cb();
                        }
                        //we must check manually if SMS was delivered
                        twilioClient.messages(gift.messageId).get(cb.wrap(function (msg) {
                            if (msg.status === "delivered") {
                                logger.info("SMS delivered " + gift.messageId);
                                gift.isDelivered = true;
                                gift.save(cbOuter);
                            } else {
                                cb();
                            }
                        }));
                    }, function (cb) {
                        logger.info("Gift not delivered " + gift.id);
                        _cancelGift(gift, "not-delivered", cb);
                    }
                ], function (err) {
                    if (err) {
                        logging.logError("checkNotDeliveredGiftsJob, gift#" + gift.id, err);
                    }
                    cbOuter();
                });
            }, cb);
        }
    ], function (err) {
        if (err) {
            logging.logError("checkNotDeliveredGiftsJob", err);
        }
        setTimeout(checkExpiredGiftsJob, config.JOB_GIFTS_INTERVAL);
    });
}

/**
 * Checks and removes the expired gift card offers.
 */
function checkExpiredGiftCardOffersJob() {
    var date = new Date().getTime();
    date = new Date(date);
    async.waterfall([
        function (cb) {
            GiftCardOffer.find({
                status: Const.GiftCardOfferStatus.ACTIVE,
                expirationDate: {
                    $lte: date
                }
            }, cb);
        }, function (offers, cb) {
            async.forEach(offers, function (offer, cb) {
                logger.info("Offer expired " + offer.id);
                var tmp = {
                    status: Const.GiftCardOfferStatus.ENDED,
                    endDateTime: moment(date).add(1, 'hours').toDate(), // to avoid a validation error as endDateTime must be a future date
                    modifiedBy: 'checkExpiredGiftCardOffersJob',
                    totalQuantity: offer.availableQuantity
                };
                GiftCardOfferService.update(offer.id, tmp, cb);
            }, cb);
        }
    ], function (err) {
        if (err) {
            logging.logError("checkExpiredGiftCardOffersJob", err);
        }
        setTimeout(checkExpiredGiftCardOffersJob, config.JOB_GIFT_CARD_OFFER_INTERVAL);
    });
}

checkExpiredGiftsJob();
checkNotDeliveredGiftsJob();

// checkExpiredUserEmail();
// as per Tammy's agreement cleaning up the unverified accounts is not needed now
checkExpiredGiftCardOffersJob();
