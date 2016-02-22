/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */

/**
 * This is the DB migration update script for production database
 *
 * @author    TCSASSEMBLER
 * @version   1.0
 */

'use strict';

var ActionRecord = require('./models').ActionRecord;
var GiftCard = require('./models').GiftCard;
var GiftCardOffer = require('./models').GiftCardOffer;
var async = require('async');
var _ = require('underscore');
var winston = require('winston');

var DEFAULT_STRING = 'N/A';

var updateActionRecord = function(record, callback) {
  if (!record.businessName) {
    _.extend(record, {businessName: DEFAULT_STRING});
    record.save(callback);
  } else {
    callback(null, record);
  }
};

var updateGiftCardAndOffer = function(model, callback) {
  if (!model.businessWebsite) {
    _.extend(model, {businessWebsite: DEFAULT_STRING});
    model.save(callback);
  } else {
    callback(null, model);
  }
};

async.waterfall([
  function(cb) {
    ActionRecord.find(cb);
  },
  function(actionRecords, cb) {
    async.map(actionRecords, updateActionRecord, cb);
  },
  function(results, cb) {
    winston.info('Action record schema updated successfully');
    cb();
  },
  function(cb) {
    GiftCard.find(cb);
  },
  function(cards, cb) {
    async.map(cards, updateGiftCardAndOffer, cb);
  },
  function(results, cb) {
    winston.info('Gift card schema updated successfully');
    cb();
  },
  function(cb) {
    GiftCardOffer.find(cb);
  },
  function(offers, cb) {
    async.map(offers, updateGiftCardAndOffer, cb);
  },
  function(results, cb) {
    winston.info('Gift card offer schema updated successfully');
    cb();
  }
], function(err) {
  if (err) {
    throw err;
  }
  winston.info('DB migration completed successfully');
  process.exit();
});
