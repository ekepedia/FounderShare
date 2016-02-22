/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */

/**
 * Init and export all schemas.
 *
 * @version 1.2
 * @author TCSASSEMBLER
 *
 * Changes in 1.1:
 * 1. add GiftCardGift
 *
 * Changes in 1.2:
 * - add StaticPage
 * - Use default mongoose connection to make the connection accessible
 *   outside of this module using mongoose.connection
 */
'use strict';

var _ = require("underscore");
var config = require('config');
var mongoose = require('mongoose');
var db = mongoose.connect(config.MONGODB_URL).connection;

var models = {
    BusinessType: db.model('BusinessType', require('./BusinessType')),
    FeedbackType: db.model('FeedbackType', require('./FeedbackType')),
    ActionRecord: db.model('ActionRecord', require('./ActionRecord')),
    Business: db.model('Business', require('./Business')),
    GiftCard: db.model('GiftCard', require('./GiftCard')),
    GiftCardGift: db.model('GiftCardGift', require('./GiftCardGift')),
    GiftCardOffer: db.model('GiftCardOffer', require('./GiftCardOffer')),
    GiftCardOfferComment: db.model('GiftCardOfferComment', require('./GiftCardOfferComment')),
    SessionToken: db.model('SessionToken', require('./SessionToken')),
    StaticPage: db.model('StaticPage', require('./StaticPage')),
    User: db.model('User', require('./User'))
};

_.each(models, function (model) {
    model.schema.options.minimize = false;
    model.schema.options.toJSON = {
        /**
         * Transform model to json object
         * @param {Object} doc the mongoose document which is being converted
         * @param {Object} ret the plain object representation which has been converted
         * @returns {Object} the transformed object
         */
        transform: function (doc, ret) {
            ret.id = String(ret._id);
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    };
});

module.exports = models;
