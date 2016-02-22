/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */
/**
 * Use this script to generate random data. All models are serialized to json files.
 *
 * Changes in version 1.1:
 *  - Updated the business address logic.
 *
 * Changes in version 1.2:
 *  - Generate more users (10) and more active offers (7)
 *
 * Changes in version 1.3
 * - Add business website to gift card offers
 *
 * Changes in version 1.4:
 * - Add static pages
 *
 * Changes in version 1.5 (Project Mom and Pop - Gift Card Offers Search and View):
 * - Generate real data based on Yelp API
 *
 * Changes in version 1.6 (Project Mom and Pop - MiscUpdate5):
 * - [PMP-206] Remove default conditions from Business
 * - [PMP-206] Add offer specific conditions to GiftCardOffer
 *
 * @version 1.6
 * @author TCSASSEMBLER
 */
'use strict';

process.env.DATA_GENERATOR = 1;

var async = require('async');
var config = require('config');
var braintree = require('braintree');
var fs = require('fs');
var path = require('path');
var _ = require('underscore');
var Moniker = require('moniker');
var moniker = Moniker.generator([Moniker.adjective, Moniker.noun], {glue: " "});
var chance = require('chance')();
var models = require("../src/models");

var BusinessService = require("../src/services/BusinessService");
var SecurityService = require("../src/services/SecurityService");
var GiftCardOfferService = require("../src/services/GiftCardOfferService");
var GiftCardService = require("../src/services/GiftCardService");
var addresses = require("./seed-data/addresses.json");
var staticPages = require("./seed-data/staticPages.json");

var defaultPasswordHash;

var testData = {};
//businesses 1 - 9 are verified
//business 10 is not
var businessCount = 10;
var usersPerBusiness = 3;
var activeOffersPerBusiness = 7;
var userCount = 10;

var USE_YELP = true;
var yelpBusinesses = require("./data/yelp-businesses.json");
if (USE_YELP) {
    businessCount = yelpBusinesses.length;
    activeOffersPerBusiness = 3;
}


/**
 * Create Business Type entities
 * @param {function(Error)} callback the callback function
 */
function createBusinessTypes(callback) {
    models.BusinessType.create([{
        "_id": 1,
        "name": "Pizza"
    }, {
        "_id": 2,
        "name": "Coffee"
    }, {
        "_id": 3,
        "name": "Fashion"
    }], callback.errorOnly());
}


/**
 * Create Business Type entities
 * @param {function(Error)} callback the callback function
 */
function createFeedbackTypes(callback) {
    models.FeedbackType.create([{
        "_id": 1,
        "name": "feedback_type1"
    }, {
        "_id": 2,
        "name": "feedback_type2"
    }, {
        "_id": 3,
        "name": "feedback_type3"
    }], callback.errorOnly());
}

/**
 * Create Business entities
 * @param {function(Error)} callback the callback function
 */
function createBusinesses(callback) {
    if (USE_YELP) {
        var nr = 0;
        async.forEach(yelpBusinesses, function (item, cb) {
            nr++;
            var tmp = nr;
            _.extend(item, {
                "isVerified": true,
                "isVerificationFeePaid": true,
                "isSubscriptionExpired": false,
                "braintreeAccountId": "fake_business_" + nr
            });
            models.Business.create(item, function (err, business) {
                testData["business" + tmp] = business;
                cb(err);
            });
        }, callback);
        return;
    }
    async.forEach(_.range(1, businessCount + 1), function (nr, cb) {
        var data = {
            "name": moniker.choose() + " b" + nr,
            "type": _.random(1, 3),
            "telephoneNumber": chance.phone(),
            "picture": "assets/i/business-logo-" + _.random(1, 3) + ".png",
            "description": chance.paragraph({sentences: 3}),
            "businessHours": _.random(1, 5) + ":00-" + _.random(9, 12) + ":00",
            "website": chance.url({path: "/"}),
            "isVerified": true,
            "isVerificationFeePaid": true,
            "isSubscriptionExpired": false,
            "braintreeAccountId": "fake_business_" + nr
        };
        var tmpAddress = _.sample(addresses);
        _.extend(data, tmpAddress);
        if (nr === 10) {
            data.isVerified = false;
            data.isVerificationFeePaid = false;
            data.braintreeAccountId = undefined;

        }
        BusinessService.create(data, function (err, business) {
            testData["business" + nr] = business;
            cb(err);
        });
    }, callback);
}

/**
 * Create User entities
 * @param {function(Error)} callback the callback function
 */
function createUsers(callback) {
    async.series([
        function (cb) {
            SecurityService.generateHash("password", cb.wrap(function (hash) {
                defaultPasswordHash = hash;
                cb();
            }));
        },
        function (cb) {
            async.forEach(_.range(1, userCount + 1), function (nr, cb) {
                models.User.create({
                    "firstName": chance.first(),
                    "lastName": chance.last(),
                    "email": "user" + nr + "@domain.com",
                    "email_lowered": "user" + nr + "@domain.com",
                    "passwordHash": defaultPasswordHash,
		    "userRoles": [{
                        "role": "INDIVIDUAL_USER"
                    }]
                }, cb.wrap(function (user) {
                    testData["user" + nr] = user;
                    cb();
                }));
            }, cb);
        }, function (cb) {
            models.User.create({
                "firstName": chance.first(),
                "lastName": chance.last(),
                "email": "superuser@domain.com",
                "email_lowered": "superuser@domain.com",
                "passwordHash": defaultPasswordHash,
                "userRoles": [{
                    "role": "PLATFORM_EMPLOYEE"
                }]
            }, cb.wrap(function (user) {
                testData.superuser = user;
                cb();
            }));
        }, function (cb) {
            async.forEach(_.range(1, businessCount + 1), function (businessNr, cb) {
                async.forEach(_.range(usersPerBusiness), function (nr, cb) {
                    if (nr === 0) {
                        models.User.create({
                            "firstName": chance.first(),
                            "lastName": chance.last(),
                            "email": "admin@b" + businessNr + ".com",
                            "email_lowered": "admin@b" + businessNr + ".com",
                            "passwordHash": defaultPasswordHash,
                            "userRoles": [{
                                "businessId": testData["business" + businessNr].id,
                                "role": "BUSINESS_ADMIN"
                            }]
                        }, cb);
                    } else {
                        models.User.create({
                            "firstName": chance.first(),
                            "lastName": chance.last(),
                            "email": "user" + nr + "@b" + businessNr + ".com",
                            "email_lowered": "user" + nr + "@b" + businessNr + ".com",
                            "passwordHash": defaultPasswordHash,
                            "userRoles": [{
                                "businessId": testData["business" + businessNr].id,
                                "role": "BUSINESS_EMPLOYEE"
                            }]
                        }, cb);
                    }
                }, cb);
            }, cb);
        }
    ], callback.errorOnly());
}

/**
 * Create GiftCardOffer entities
 * @param {function(Error)} callback the callback function
 */
function createGiftCardOffers(callback) {
    async.forEach(_.range(1, businessCount + 1), function (businessNr, cb) {
        if (!USE_YELP) {
            if (businessNr % 4 === 3 || businessNr === 10) {
                return cb();
            }
        }
        var business = testData["business" + businessNr];
        var expiration = new Date(new Date().getTime() + config.OFFER_EXPIRATION_DAYS * 1000 * 60 * 60 * 24);
        var baseFields = {
            "businessId": business.id,
            "businessName": business.name,
            "businessType": business.type,
            "businessStreetAddress": business.streetAddress,
            "businessCity": business.city,
            "businessWebsite": business.website,
            "businessState": business.state,
            "businessCountry": business.country,
            "businessZip": business.zip,
            "businessPicture": business.picture,
            "businessTelephone": business.telephoneNumber,
            "businessCoordinates": business.coordinates,
	    "conditions": "Some offer specific conditions.",
            "modifiedBy": "anonymous",
            "createdBy": "anonymous",
            endDateTime: new Date(2020, 1, 1),
            expirationDate: expiration
        };

        var quantity1 = _.random(4, 8) * 100;
        var quantity3 = _.random(4, 8) * 100;
        var offers = [
            _.extend({
                "description": chance.paragraph({sentences: 2}),
                "discount": _.random(2, 7) * 10,
                "availableQuantity": quantity1,
                "activationDateTime": new Date(),
                "status": "DRAFT",
                "totalQuantity": quantity1,
                "redeemedQuantity": 0,
                "createdOn": new Date()
            }, baseFields),
            _.extend({
                "description": chance.paragraph({sentences: 2}),
                "discount": _.random(2, 7) * 10,
                "availableQuantity": quantity3,
                "activationDateTime": new Date(),
                "status": "CANCELLED",
                "totalQuantity": quantity3,
                "redeemedQuantity": 0,
                "createdOn": new Date()
            }, baseFields),
            _.extend({
                "description": chance.paragraph({sentences: 2}),
                "discount": _.random(2, 7) * 10,
                "availableQuantity": quantity3,
                "activationDateTime": new Date(2014, 1, 1),
                "status": "ENDED",
                "totalQuantity": quantity3,
                "redeemedQuantity": 0,
                "createdOn": new Date()
            }, baseFields)
        ];
        _(activeOffersPerBusiness).times(function () {
            var quantity = _.random(4, 8) * 100;
            var DAY = 24 * 60 * 60 * 1000;
            var now = new Date().getTime();
            var createdOn = new Date(now - _.random(5  * DAY, 15  * DAY));
            var expirationDate = new Date(now + _.random(5  * DAY, 15  * DAY));
            offers.push(
                _.extend({}, baseFields, {
                    "description": chance.paragraph({sentences: 2}),
                    "discount": _.random(2, 7) * 10,
                    "availableQuantity": quantity,
                    "activationDateTime": createdOn,
                    "status": "ACTIVE",
                    "totalQuantity": quantity,
                    "redeemedQuantity": 0,
                    "createdOn": createdOn,
                    expirationDate: expirationDate
                }));
        });
        models.GiftCardOffer.create(offers, cb);
    }, callback.errorOnly());
}

/**
 * Create GiftCard entities
 * @param {function(Error)} callback the callback function
 */
function createGiftCards(callback) {
    async.waterfall([
        function (cb) {
            models.GiftCardOffer.find({status: "ACTIVE"}, cb);
        }, function (allOffers, cb) {
            async.forEach(_.range(1, userCount + 1), function (nr, cb) {
                var username = "user" + nr;
                var offers = _.sample(allOffers, 25);
                var shoppingCart = _.map(offers, function (offer) {
                    var max = Math.floor(offer.availableQuantity / 8);
                    return {
                        paymentMethodNonce: braintree.Test.Nonces.Transactable,
                        giftCardOfferId: offer.id,
                        quantity: Math.min(_.random(2, 200), max)
                    };
                });
                GiftCardOfferService.purchase(testData[username].id, shoppingCart, cb);
            }, cb);
        }
    ], callback.errorOnly());
}

/**
 * Redeem gift cards
 * @param {function(Error)} callback the callback function
 */
function createRedeems(callback) {
    async.forEach(_.range(1, userCount + 1), function (nr, cb) {
        var username = "user" + nr;
        async.waterfall([
            function (cb) {
                models.GiftCard.find({ownerId: testData[username].id}, cb);
            }, function (allGiftCards, cb) {
                var cards = _.sample(allGiftCards, 10);
                async.forEach(cards, function (giftCard, cb) {
                    var amount = _.random(Math.floor(giftCard.quantity * 0.4), Math.floor(giftCard.quantity * 0.8)) || 1;
                    GiftCardService.redeem(giftCard.currentQRCode, amount, giftCard.businessId, cb);
                }, cb);
            }
        ], cb);
    }, callback);
}

/**
 * Create SessionToken entities
 * @param {function(Error)} callback the callback function
 */
function createSessionTokens(callback) {
    async.waterfall([
        function (cb) {
            models.User.find({}, cb);
        }, function (users, cb) {
            async.forEach(users, function (user, cb) {
                models.SessionToken.create({
                    userId: user.id,
                    token: user.email.replace("@", "_"),
                    expirationDate: new Date(2020, 0, 1)
                }, cb);
            }, cb);
        }
    ], callback.errorOnly());
}


/**
 * Create StaticPage entities
 * @param {function(Error)} callback the callback function
 */
function createStaticPages(callback) {
    models.StaticPage.create(staticPages, callback.errorOnly());
}


async.waterfall([
    function (cb) {
        async.forEach(_.values(models), function (model, cb) {
            model.remove({}, cb);
        }, cb);
    }, function (cb) {
        async.series([
            createBusinessTypes,
            createFeedbackTypes,
            createBusinesses,
            createUsers,
            createGiftCardOffers,
            createGiftCards,
            createRedeems,
            createSessionTokens,
            createStaticPages
        ], cb.errorOnly());
    }, function (cb) {
        async.forEach(_.values(models), function (model, cb) {
            model.find({}, cb.wrap(function (items) {
                items = _.toJSON(items);
                _.each(items, function (item) {
                    item._id = item.id;
                    delete item.id;
                });
                fs.writeFileSync(path.join(__dirname, "data/" + model.modelName + ".json"), JSON.stringify(items, null, 4));
                cb();
            }));
        }, cb);
    }
], function (err) {
    if (err) {
        console.log(JSON.stringify(err, null, 4));
        console.log(err.stack);
        console.log(err);
        process.exit(0);
    }
    console.log("Data created successfully");
    process.exit(0);
});
