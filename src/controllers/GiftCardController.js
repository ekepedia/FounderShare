/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */

/**
 * This controller exposes REST actions for gift card offers
 *
 * @author TCSASSEMBLER
 * @version 1.4
 *
 * Changes in version 1.1:
 * 1. Add actions for gifting functionality
 *
 * Changes in version 1.2:
 * - Added searchGiftCards() and searchGiftCardChampions() method.
 *
 * Changes in version 1.3:
 * - Fix user population in searchGiftCardChampions (faster loop)
 * - use bitly to shorten links in sendGift
 *
 * Changes in version 1.4:
 * - Fix for [PMP-184]: set email gift as delivered
 */
'use strict';

var _ = require("underscore");
var async = require("async");
var config = require("config");
var moment = require("moment");
var validate = require("../common/validator").validate;
var helper = require("../common/helper");
var logging = require("../common/logging");
var Const = require("../Const");
var ForbiddenError = require("../common/errors").ForbiddenError;
var NotFoundError = require("../common/errors").NotFoundError;
var BadRequestError = require("../common/errors").BadRequestError;
var GiftCardService = require("../services/GiftCardService");
var NotificationService = require("../services/NotificationService");
var UserService = require("../services/UserService");
var twilio = require('twilio');
var Twitter = require('twitter');
var Entities = require('html-entities').AllHtmlEntities;
var lookupsClient = new twilio.LookupsClient(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);

/**
 * Search gift cards.
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function searchMyGiftCards(req, res, next) {
    var criteria = req.query;
    helper.fixQueryStringForSearchCriteria(criteria);
    criteria.ownerId = req.user.id;
    GiftCardService.search(criteria, next.wrap(function (result) {
        res.json(result);
    }));
}

/**
 * Search gift cards.
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function searchGiftCards(req, res, next) {
    var criteria = req.query;
    helper.fixQueryStringForSearchCriteria(criteria);
    criteria.businessId = req.user.businessId;
    GiftCardService.search(criteria, next.wrap(function (result) {
        _.each(result.items, function (item) {
            delete item.currentQRCode;
	    delete item.oldQRCode;
        });
        res.json(result);
    }));
}
/**
 * Search gift card champions.
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function searchGiftCardChampions(req, res, next) {
    var champions;
    async.waterfall([
        function (cb) {
            var criteria = req.query;
            helper.fixQueryStringForSearchCriteria(criteria);
            criteria.giftCardOfferId = req.params.giftCardOfferId;
            GiftCardService.search(criteria, cb);
        }, function (result, cb) {
            champions = result.items;
            UserService.getAll(cb);
        }, function (users) {
            var index = _.indexBy(users, "id");
            _.each(champions, function (champ) {
                var user = index[champ.ownerId];
                if (user) {
                    champ.firstName = user.firstName;
                    champ.lastName = user.lastName;
                    champ.linkedSocialNetwork = user.linkedSocialNetwork;
                }
            });
            res.json(champions);
        }
    ], next);

}
/**
 * Get a gift card.
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function getMyGiftCard(req, res, next) {
    GiftCardService.get(req.params.id, next.wrap(function (result) {
        if (!result) {
            return next(new NotFoundError("Gift card not found"));
        }
        if (!_.compareObjectId(result.ownerId, req.user.id)) {
            return next(new ForbiddenError("Gift card doesn't belong to you"));
        }
        res.json(result);
    }));
}

/**
 * Redeem a gift card.
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function redeemGiftCard(req, res, next) {
    GiftCardService.redeem(req.query.qrCode, Number(req.query.amount), req.user.businessId, next.wrap(function (result) {
        //don't expose new created qr code to business owner/employee
        delete result.currentQRCode;
	delete result.oldQRCode;
        res.json(result);
    }));
}

/**
 * Get gift card by qr code.
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function getByQRCode(req, res, next) {
    GiftCardService.getByQRCode(req.params.qrCode, req.user.businessId, next.wrap(function (result) {
        res.json(result);
    }));
}

/**
 * Send gift to email or phone number
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 * @since 1.1
 */
function sendGift(req, res, next) {
    var error = validate(
        {target: req.body.target, type: req.body.type, extraMessage: req.body.extraMessage},
        {
            __obj: true,
            target: "ShortString?",
            type: {type:"enum", enum: [Const.GiftCardGiftType.PHONE_NUMBER, Const.GiftCardGiftType.EMAIL]},
            extraMessage: "ShortString?"
        });
    if (error) {
        return next(error);
    }
    var gift = {
        quantity: req.body.quantity,
        type: req.body.type,
        metadata: {
            target: req.body.target
        }
    };
    var createdGift, giftCard;
    async.waterfall([
        function (cb) {
            if (gift.type === Const.GiftCardGiftType.PHONE_NUMBER) {
                lookupsClient.phoneNumbers(req.body.target).get({Type: "carrier"}, function (err, result) {
                    if (err) {
                        cb(new BadRequestError("Invalid phone number " + JSON.stringify(err)));
                    } else if (result.carrier.type !== "mobile") {
                        //sendSMS won't work for non-mobile numbers
                        cb(new BadRequestError("Provided number is not a mobile number."));
                    } else {
                        cb();
                    }
                });
            } else {
                cb();
            }
        }, function (cb) {
            GiftCardService.giveGiftCard(req.user.id, req.params.giftCardId, gift, cb);
        }, function (result) {
            createdGift = result;
            res.status(204).end();
            //send email or sms in background
            //if any operation fails now, it will be refunded after 24h

            async.waterfall([
                function (cb) {
                    GiftCardService.get(req.params.giftCardId, cb);
                }, function (result, cb) {
                    giftCard = result;
                    var fullUrl = config.DESKTOP_APP_URL + "#/Gift/" + createdGift.code;
                    helper.shortenLink(fullUrl, cb);
                }, function (url, cb) {
                    var values = {
                        extraMessage: "",
                        giverName: req.user.firstName,
                        amount: createdGift.quantity.toFixed(2),
                        businessName: giftCard.businessName,
                        url: url
                    };
                    if (req.body.extraMessage && req.body.extraMessage.trim().length) {
                        values.extraMessage = req.body.extraMessage.trim() + "\n\n";
                    }
                    if (gift.type === Const.GiftCardGiftType.EMAIL) {
                        if (values.extraMessage) {
                            var entities = new Entities();
                            values.extraMessage = entities.encode(values.extraMessage).replace(/&NewLine;/g, "<br/>");
                        }
                        NotificationService.sendEmail(req.body.target, "gift", values, cb);
                    } else {
                        NotificationService.sendSMS(req.body.target, "sms_gift", values, cb);
                    }
                }, function (result, cb) {
                    var values;
                    if (gift.type === Const.GiftCardGiftType.EMAIL) {
			/* At this point, if nodemailer did not
			 * encounter an error, we can be shure that
			 * the email has been delivered. Set the
			 * status appropriately, so the gift does not
			 * get cancelled by the worker job.
			 *
			 * See issue [PMP-184]
			 */
			values = {
			    messageId: result.messageId,
			    isDelivered: true
			};
                    } else {
                        values = {messageId: result.sid};
                    }
                    GiftCardService.updateGiftCardGift(createdGift.id, values, cb);
                }
            ], function (err) {
                if (err) {
                    logging.logError("sendGift", err);
                }
            });
        }
    ], next);
}


/**
 * Send gift to email or phone number
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 * @since 1.1
 */
function sendGiftToTwitter(req, res, next) {
    var error = validate(
        req.body,
        {
            __obj: true,
            accessToken: String,
            accessTokenSecret: String,
            friendId: String,
            quantity: Number
        });
    if (error) {
        return next(error);
    }
    var client = new Twitter({
        consumer_key: config.TWITTER_CONSUMER_KEY,
        consumer_secret: config.TWITTER_CONSUMER_SECRET,
        access_token_key: req.body.accessToken,
        access_token_secret: req.body.accessTokenSecret
    });
    var gift = {
        quantity: req.body.quantity,
        type: Const.GiftCardGiftType.TWITTER
    };
    var createdGift, giftCard, friend;
    async.waterfall([
        function (cb) {
            client.get("/users/show", {user_id: req.body.friendId, include_entities: false}, cb);
        }, function (result, response, cb) {
            friend = result;
            gift.metadata = {
                targetTwitterUser: friend.id_str,
                target: "@" + friend.screen_name
            };
            GiftCardService.giveGiftCard(req.user.id, req.params.giftCardId, gift, cb);
        }, function (result) {
            createdGift = result;
            res.status(204).end();
            //post to twitter in background
            async.waterfall([
                function (cb) {
                    GiftCardService.get(req.params.giftCardId, cb);
                }, function (result, cb) {
                    giftCard = result;
                    var baseUrl = config.DESKTOP_APP_URL;
                    //localhost link doesn't work in twitter
                    if (baseUrl.indexOf("localhost") !== -1) {
                        baseUrl = baseUrl.replace("localhost", "local.foundershare.com");
                    }
                    var values = {
                        friend: "@" + friend.screen_name,
                        giverName: req.user.firstName,
                        amount: createdGift.quantity.toFixed(2),
                        businessName: giftCard.businessName,
                        url: baseUrl + "?go=" + encodeURIComponent("/Gift/" + createdGift.code + "?type=twitter")
                    };
                    NotificationService.renderTemplate("twitter_gift", values, cb);
                }, function (content, cb) {
                    client.post('statuses/update', {status: content}, cb.errorOnly());
                }, function (cb) {
                    GiftCardService.updateGiftCardGift(createdGift.id, {isDelivered: true}, cb);
                }
            ], function (err) {
                if (err) {
                    logging.logError("sendGiftToTwitter", err);
                }
            });
        }
    ], next);
}

/**
 * Send an email to gifter that gift has been accepted
 * @param {Object} user the user who accepted the gift
 * @param {Object} gift the gift
 * @private
 * @since 1.1
 */
function _sendAcceptGiftEmail(user, gift) {
    var giftCard;
    async.waterfall([
        function (cb) {
            GiftCardService.get(gift.sourceGiftCardId, cb);
        }, function (result, cb) {
            giftCard = result;
            UserService.get(giftCard.ownerId, cb);
        }, function (owner, cb) {
            if (!owner.email) {
                return;
            }
            var values = {
                firstName: owner.firstName,
                recipient: user.firstName,
                amount: gift.quantity.toFixed(2),
                business: giftCard.businessName,
                timestamp: moment().format("MMMM DD, YYYY @ hh:mm A")
            };
            NotificationService.sendEmail(owner.email, "gift-accepted", values, cb);
        }
    ], function (err) {
        if (err) {
            logging.logError("sendAcceptGiftEmail", err);
        }
    });
}

/**
 * Accept a gift
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 * @since 1.1
 */
function acceptGift(req, res, next) {
    GiftCardService.acceptGift(req.user.id, req.params.code, undefined, next.wrap(function (result, gift) {
        _sendAcceptGiftEmail(req.user, gift);
        res.json(result);
    }));
}

/**
 * Accept a gift from twitter
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 * @since 1.1
 */
function acceptGiftFromTwitter(req, res, next) {
    var error = validate(
        req.body,
        {
            __obj: true,
            accessToken: String,
            accessTokenSecret: String
        });
    if (error) {
        return next(error);
    }
    var client = new Twitter({
        consumer_key: config.TWITTER_CONSUMER_KEY,
        consumer_secret: config.TWITTER_CONSUMER_SECRET,
        access_token_key: req.body.accessToken,
        access_token_secret: req.body.accessTokenSecret
    });
    async.waterfall([
        function (cb) {
            client.get("/account/verify_credentials", cb);
        }, function (result, response, cb) {
            GiftCardService.acceptGift(req.user.id, req.params.code, result.id_str, cb);
        }, function (result, gift)  {
            _sendAcceptGiftEmail(req.user, gift);
            res.json(result);
        }
    ], next);
}

module.exports = {
    searchMyGiftCards: searchMyGiftCards,
    searchGiftCards: searchGiftCards,
    searchGiftCardChampions: searchGiftCardChampions,
    getMyGiftCard: getMyGiftCard,
    redeemGiftCard: redeemGiftCard,
    getByQRCode: getByQRCode,
    sendGift: sendGift,
    acceptGift: acceptGift,
    sendGiftToTwitter: sendGiftToTwitter,
    acceptGiftFromTwitter: acceptGiftFromTwitter
};
