/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */

/**
 * This controller exposes REST actions for lookup service.
 *
 * @author TCSASSEMBLER
 * @version 1.1
 *
 * Changes in version 1.1 (Project Mom and Pop - MiscUpdate5):
 * - add getPlatformConditions method
 */
'use strict';

var config = require('config');
var LookupService = require("../services/LookupService");

/**
 * Get all feedback types.
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function getAllFeedbackTypes(req, res, next) {
  LookupService.getAllFeedbackTypes(next.wrap(function (result) {
    res.json(result);
  }));
}

/**
 * Get all business types.
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function getAllBusinessTypes(req, res, next) {
  LookupService.getAllBusinessTypes(next.wrap(function (result) {
    res.json(result);
  }));
}

/**
 * Get default platform conditions for gift card offers.
 * @param {Object} req the request
 * @param {Object} res the response
 */
function getPlatformConditions(req, res) {
    res.json({conditions: config.BUSINESS_CONDITION});
}

module.exports = {
  getAllFeedbackTypes: getAllFeedbackTypes,
  getAllBusinessTypes: getAllBusinessTypes,
  getPlatformConditions: getPlatformConditions
};
