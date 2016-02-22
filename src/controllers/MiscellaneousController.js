/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */

/**
 * This controller exposes REST misc actions.
 *
 * @author TCSASSEMBLER
 * @version 1.3
 *
 * Changes in 1.1 (Project Mom and Pop - Gift Card Offers Search and View):
 * - add getCoordinates
 *
 * Changes in 1.2 (Project Mom and Pop - MiscUpdate5):
 * - [PMP-205] Make feedback message field optional
 *
 * Changes in 1.3 (Project Mom and Pop - Release Fall 2015 Assembly):
 * - [PMP-224] Implement user feedback
 */
'use strict';

var NotificationService = require("../services/NotificationService");
var ActionRecordService = require('../services/ActionRecordService');
var config = require("config");
var async = require("async");
var CachemanMongo = require('cacheman-mongo');
var ipCache = new CachemanMongo(config.MONGODB_URL, {collection: "ip-location-cache"});
var satelize = require('satelize');

/**
 * Send feedback to an admin using emailing function.
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function sendFeedback(req, res, next) {
    if (req.user) {
        req.body.userId = req.user.id;
    }
    if (!req.body.message.length) {
	req.body.message = '[The user didn\'t provide a message]';
    }
    NotificationService.notifyAdminOfFeedback(req.body, next.wrap(function () {
        res.end();
    }));
}

/**
 * Send feedback to an admin using emailing function.
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function reportAbuse(req, res, next) {
    if (req.user) {
        req.body.userId = req.user.id;
    }
    NotificationService.notifyAdminOfReportedAbuse(req.body, next.wrap(function () {
        res.end();
    }));
}

/**
 * Send an invite to a friend of a user using emailing function.
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function inviteFriend(req, res, next) {
    req.body.userId = req.user.id;
    NotificationService.notifyUserOfInvitation(req.body, next.wrap(function () {
        res.end();
    }));
}
/**
 * Get coordinates of current user
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 * @since 1.1
 */
function getCoordinates(req, res, next) {
    var ip = req.ip;
    if (ip === "127.0.0.1") {
        ip = config.MOCK_LOCALHOST_IP;
    }
    async.waterfall([
        function (cb) {
            ipCache.get(ip, cb);
        }, function (value, cb) {
            if (value) {
                res.jsonp(value);
            } else {
                satelize.satelize({ip: ip}, cb);
            }
        }, function (value, cb) {
            ipCache.set(ip, value, config.IP_LOCATION_CACHE_SECONDS, cb);
        }, function (value) {
            res.jsonp(value);
        }
    ], next);
}
/**
 * Set user ratings
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function setRatings(req, res, next) {
    ActionRecordService.setRatings(req.body, function() {
	res.json({});
    });
}

module.exports = {
    sendFeedback: sendFeedback,
    reportAbuse: reportAbuse,
    inviteFriend: inviteFriend,
    getCoordinates: getCoordinates,
    setRatings: setRatings
};
