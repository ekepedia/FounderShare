/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */

/**
 * This controller exposes REST actions for gift card offers
 *
 * Changes in version 1.1:
 *  - Added renewGiftCardOffer() method and fixed some other issues.
 *
 * Changes in version 1.2:
 *  - [PMP-167] Notify business owner of activity
 *
 * Changes in version 1.3 (Project Mom and Pop - Gift Card Offers Search and View):
 *  - Implement search by distance in searchGiftCardOffer
 *
 * Changes in version 1.4 (Project Mom and Pop - MiscUpdate5):
 *  - [PMP-206] Include platform conditions in GiftCardOffer
 *  - Remove unused require
 *
 * Changes in version 1.5 (Project Mom and Pop - Release Fall 2015 Assembly):
 * - [PMP-230] Email gift card to owner
 * - [PMP-229] Add sortByDiscount in search method
 *
 * @author TCSASSEMBLER
 * @version 1.5
 */
'use strict';

var _ = require("underscore");
var async = require("async");
var config = require("config");
var Role = require("../Const").UserRole;
var SortOrder = require("../Const").SortOrder;
var helper = require("../common/helper");
var logging = require("../common/logging");
var ForbiddenError = require("../common/errors").ForbiddenError;
var NotFoundError = require("../common/errors").NotFoundError;
var GiftCardOfferService = require("../services/GiftCardOfferService");
var UserService = require("../services/UserService");
var NotificationService = require("../services/NotificationService");

/**
 * Get and check if current user has permission to requested gift card.
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 * @private
 */
function _checkGiftCardPermission(req, res, next) {
    var isPlatformAdmin = _.findWhere(req.user.userRoles, {role: Role.PLATFORM_EMPLOYEE});
    if (!isPlatformAdmin && !_.compareObjectId(req.giftCardOffer.businessId, req.user.businessId)) {
        return next(new ForbiddenError("Gift card offer doesn't belong to your business."));
    }
    next();
}

/**
 * Get a gift card offer based on id parameter
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 * @private
 */
function _fetchGiftCardOffer(req, res, next) {
    GiftCardOfferService.getById(req.params.id, next.wrap(function (offer) {
        if (!offer) {
            return next(new NotFoundError("Gift card offer not found"));
        }
        req.giftCardOffer = offer;
        next();
    }));
}

/**
 * Cast date fields
 * @param {Object} values the request object
 * @private
 */
function _castDates(values) {
    if (values.activationDateTime) {
        values.activationDateTime = new Date(values.activationDateTime);
    }
    if (values.endDateTime) {
        values.endDateTime = new Date(values.endDateTime);
    }
}

/**
 * Create a gift card offer.
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function createGiftCardOffer(req, res, next) {
    var values = req.body;
    values.createdBy = values.modifiedBy = req.user.id;
    values.businessId = req.user.businessId;
    _castDates(values);
    GiftCardOfferService.create(values, next.wrap(function (offer) {
        res.json(offer);
    }));
}

/**
 * Update a gift card offer.
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function updateGiftCardOffer(req, res, next) {
    //frontend may submit all business fields
    var values = _.pick(req.body, "description", "discount", "activationDateTime", "endDateTime", "status", "totalQuantity");
    values.modifiedBy = req.user.id;
    _castDates(values);
    GiftCardOfferService.update(req.params.id, values, next.wrap(function (offer) {
        res.json(offer);
    }));
}

/**
 * Search gift card offers.
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function searchGiftCardOffer(req, res, next) {
    var criteria = req.query;
    helper.fixQueryStringForSearchCriteria(criteria);
    if (criteria.ids && !_.isArray(criteria.ids)) {
        criteria.ids = [criteria.ids];
    }
    if (criteria.businessType) {
        criteria.businessType = Number(criteria.businessType);
    }
    if (criteria.lat && criteria.long) {
	if (criteria.sortByDiscount) {
            criteria.sortByDiscount = true;
	}
        criteria.lat = Number(criteria.lat);
        criteria.long = Number(criteria.long);
        GiftCardOfferService.searchWithCoordinates(criteria, next.wrap(function (offer) {
            res.json(offer);
        }));
    } else {
	if (criteria.sortByDiscount) {
	    delete criteria.sortByDiscount;
            criteria.sortBy = "discount";
	    criteria.sortOrder = SortOrder.DESCENDING;
	}
        GiftCardOfferService.search(criteria, next.wrap(function (offer) {
            res.json(offer);
        }));
    }
}

/**
 * Cancel a gift card offer.
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function cancelGiftCardOffer(req, res, next) {
    GiftCardOfferService.cancel(req.params.id, next.wrap(function (offer) {
        res.json(offer);
    }));
}

/**
 * Renew gift card offer.
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function renewGiftCardOffer(req, res, next) {
    GiftCardOfferService.renew(req.params.id, next.wrap(function (offer) {
        res.json(offer);
    }));
}

/**
 * Delete a gift card offer.
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function deleteGiftCardOffer(req, res, next) {
    GiftCardOfferService.remove(req.params.id, next.wrap(function () {
        res.end();
    }));
}

/**
 * Get a gift card offer.
 * @param {Object} req the request
 * @param {Object} res the response
 */
function getGiftCardOffer(req, res) {
    var offer = req.giftCardOffer;
    offer.platformConditions = config.BUSINESS_CONDITION;
    res.json(offer);
}

/**
 * Purchase gift cards.
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function purchaseGiftCards(req, res, next) {
    GiftCardOfferService.purchase(req.user.id, req.body, next.wrap(function (result) {
        res.json(result);
	/* Send notification email to business owner [PMP-167] */
	_.each(req.body, function(offer) {
	    async.waterfall([
		function(cb) {
		    GiftCardOfferService.getById(offer.giftCardOfferId, cb);
		}, function(giftCardOffer, cb) {
		    UserService.search({
			'userRoles.businessId': giftCardOffer.businessId,
			'userRoles.role': Role.BUSINESS_ADMIN
		    }, cb);
		}, function(users, cb) {
		    if (!users.length) {
			cb(new Error('No Business Admin found'));
		    }
		    var ownerEmail = users[0].email;
		    var ownerName = users[0].firstName;
		    NotificationService.sendEmail(ownerEmail,
						  'notify-business-owner',
						  {name: ownerName, type: 'purchase'},
						  cb.errorOnly());
		}], function(err) {
		    if (err) {
			logging.logError('purchaseGiftCards', err);
		    }
		});
	});
    }));
}

/**
 * Add a comment to gift card offer.
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function addComment(req, res, next) {
    var comment = {
        giftCardOfferId: req.params.id,
        username: req.user.firstName,
        userId: req.user.id,
        comment: req.body.comment
    };
    GiftCardOfferService.addComment(comment, next.wrap(function (result) {
        res.json(result);
	/* Send notification email to business owner [PMP-167]*/
	async.waterfall([
	    function(cb) {
		GiftCardOfferService.getById(req.params.id, cb);
	    }, function(giftCardOffer, cb) {
		UserService.search({
		    'userRoles.businessId': giftCardOffer.businessId,
		    'userRoles.role': Role.BUSINESS_ADMIN
		}, cb);
	    }, function(users, cb) {
		if (!users.length) {
		    cb(new Error('No Business Admin found'));
		}
		var ownerEmail = users[0].email;
		var ownerName = users[0].firstName;
		NotificationService.sendEmail(ownerEmail,
			'notify-business-owner',
			{name: ownerName, type: 'comment'},
			cb);
	    }], function(err) {
		if (err) {
		    logging.logError('addComment', err);
		}
	    });
    }));
}

/**
 * Remove a comment from gift card offer.
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function removeComment(req, res, next) {
    GiftCardOfferService.removeComment(req.params.id, req.params.businessId, next.wrap(function () {
        res.end();
    }));
}

/**
 * Get all comments for a gift card offer
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function getComments(req, res, next) {
    GiftCardOfferService.getComments(req.params.id, next.wrap(function (result) {
        res.json(result);
    }));
}

/**
 * Get braintree token.
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function getBraintreeToken(req, res, next) {
    GiftCardOfferService.getBraintreeToken(next.wrap(function (result) {
        res.json({token: result});
    }));
}
/**
 * Add view count.
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function increaseViewCount(req, res, next) {
    GiftCardOfferService.increaseViewCount(req.params.id, next.wrap(function () {
        res.end();
    }));
}
/**
 * Add shared count.
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function increaseSharedCount(req, res, next) {
    GiftCardOfferService.increaseSharedCount(req.params.id, next.wrap(function () {
        res.end();
    }));
}

module.exports = {
    searchGiftCardOffer: searchGiftCardOffer,
    createGiftCardOffer: createGiftCardOffer,
    getGiftCardOffer: [_fetchGiftCardOffer, getGiftCardOffer],
    updateGiftCardOffer: [_fetchGiftCardOffer, _checkGiftCardPermission, updateGiftCardOffer],
    cancelGiftCardOffer: [_fetchGiftCardOffer, _checkGiftCardPermission, cancelGiftCardOffer],
    renewGiftCardOffer: [_fetchGiftCardOffer, _checkGiftCardPermission, renewGiftCardOffer],
    deleteGiftCardOffer: [_fetchGiftCardOffer, _checkGiftCardPermission, deleteGiftCardOffer],
    purchaseGiftCards: purchaseGiftCards,
    addComment: [_fetchGiftCardOffer, addComment],
    removeComment: removeComment,
    getComments: getComments,
    increaseViewCount: increaseViewCount,
    increaseSharedCount: increaseSharedCount,
    getBraintreeToken: getBraintreeToken
};
