/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */

/**
 * This controller exposes REST actions for static page editing.
 *
 * Changes in 1.1 (Project Mom and Pop - MiscUpdate5):
 * - Remove unused variables
 *
 * @author TCSASSEMBLER
 * @version 1.1
 */
'use strict';

var Const = require("../Const");
var fs = require("fs");
var path = require("path");
var AWS = require("aws-sdk");
var config = require("config");
var helper = require("../common/helper");
var SecurityService = require("../services/SecurityService");
var StaticPageService = require("../services/StaticPageService");

/**
 * Get all pages.
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function getAllPages(req, res, next) {
    StaticPageService.search({}, next.wrap(function(result) {
	res.json(result.items);
    }));
}

/**
 * Get page by name.
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function getPageByName(req, res, next) {
    var name = req.params.name;
    StaticPageService.getByName(name, next.wrap(function(result) {
	res.json(result);
    }));
}

/**
 * Update page.
 * @param {Object} req the request
 * @param {Object} res the response
 * @param {Function} next the next middleware
 */
function updatePage(req, res, next) {
    var page = req.body.page;
    var id = page.id;
    delete page.id;
    SecurityService.authenticate(req.user.email, req.body.password, next.wrap(function() {
	StaticPageService.update(id, page, next.wrap(function(result) {
	    res.json(result);
	}));
    }));
}

/**
 * Upload a file.
 * @param {Object} req the request
 * @param {Object} res the response
 */
function uploadFile(req, res) {
    AWS.config.update(config.AWS);

    var s3 = new AWS.S3();
    var body = fs.createReadStream(req.files.upload.path);
    var filename = config.AWS_PHOTOS_PREFIX + '_' + helper.randomString(Const.SAFE_RANDOM_LENGTH) + path.extname(req.files.upload.originalname);
    var options = {
	Bucket: config.AWS_BUCKET_NAME,
	Key: filename,
	ContentType: req.files.upload.mimetype,
	ACL: 'public-read',
	Body: body
    };
    s3.upload(options, function(err, data) {
	if (err) {
	    res.json({
		uploaded: 0,
		error: err
	    });
	    return;
	}
	res.json({
	    uploaded: 1,
	    fileName: filename,
	    etag: data.ETag,
	    url: data.Location
	});
    });
}

module.exports = {
    getAllPages: getAllPages,
    getPageByName: getPageByName,
    updatePage: updatePage,
    uploadFile: uploadFile
};
