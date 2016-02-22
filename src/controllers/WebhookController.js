/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */

/**
 * This controller for 3rd party API webhook.
 *
 * Changes in version 1.1:
 *  - Code Style fixes
 *  - Remove unused require
 *
 * @author TCSASSEMBLER
 * @version 1.1
 */
'use strict';

var async = require("async");
var Const = require("../Const");
var BadRequestError = require("../common/errors").BadRequestError;
var GiftCardService = require("../services/GiftCardService");
var braintree = require('braintree');
var config = require("config");
var BusinessService = require("../services/BusinessService");

/**
 * Executed when an email messages was delivered successfully.
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function mailgunMessageDelivered(req, res, next) {
    async.waterfall([
        function (cb) {
            var messageId = String(req.body['Message-Id']);
            if (!messageId) {
                return next(new BadRequestError("Message-Id is required"));
            }
            //it is in format e.g. <emailaddress@domain.com>
            messageId = messageId.replace("<", "").replace(">", "");
            GiftCardService.getGiftCardGiftByMessageId(messageId, cb);
        }, function (gift, cb) {
            if (!gift) {
                //non-gifting email
                res.status(204).end();
                return;
            }
            if (gift.status !== Const.GiftCardGiftStatus.PENDING) {
                return next(new Error("only pending gift card can be updated"));
            }
            GiftCardService.updateGiftCardGift(gift.id, {isDelivered: true}, cb);
        }, function () {
            res.status(204).end();
        }
    ], next);
}

function subscription(req, res, next) {
    async.waterfall([
        function () {
            var gateway = braintree.connect(config.BRAINTREE_GATEWAY_CONFIG);
            res.send(gateway.webhookNotification.verify(req.query.bt_challenge));
        }
    ], next);
}


function subscriptionChanged(req, res, next) {
    var eventKind = null;
    async.waterfall([
        function (cb) {
            var gateway = braintree.connect(config.BRAINTREE_GATEWAY_CONFIG);
            gateway.webhookNotification.parse(
                req.body.bt_signature,
                req.body.bt_payload,
                cb
            );
        }, function(webhookNotification, cb) {
            console.log("[Webhook Received " + webhookNotification.timestamp + "] | Kind: " + webhookNotification.kind + " | subscription id: " + webhookNotification.subscription.id);
            eventKind = webhookNotification.kind;
            BusinessService.getBySubscriptionId(webhookNotification.subscription.id, cb);
        }, function(result, cb) {
            if (result) {
                if (eventKind === 'subscription_canceled' || eventKind === 'subscription_expired' || eventKind === 'subscription_charged_unsuccessfully') {
                    BusinessService.update(result.id, {isVerificationFeePaid: false}, cb);
                } else if (eventKind === 'subscription_charged_successfully') {
                    BusinessService.update(result.id, {isVerificationFeePaid: true}, cb);
                } else {
                    cb(null, null);
                }
            } else {
                cb(null, null);
            }
        }, function() {
            res.status(200).end();
        }
    ], next);
}

module.exports = {
    mailgunMessageDelivered: mailgunMessageDelivered,
    subscription: subscription,
    subscriptionChanged: subscriptionChanged
};
