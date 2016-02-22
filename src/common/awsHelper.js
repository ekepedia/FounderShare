/*
 * Copyright (C) 2015 TopCoder Inc., All Rights Reserved.
 */
/**
 * Contains helper methods for AWS
 *
 * @version 1.0
 * @author TCSASSEMBLER
 */
"use strict";

var config = require("config");
var fs = require("fs");
var AWS = require('aws-sdk');
var helper = require("./helper");

AWS.config.update(config.AWS);

/**
 * Upload a photo to S3
 * @param {Object} file the file to upload (object from req.files)
 * @param {function(Error, String)} callback the callback function with arguments
 * - the error
 * - the url of upload photo
 */
function uploadPhotoToS3(file, callback) {
    var s3 = new AWS.S3();
    var fileStream = fs.createReadStream(file.path);
    var name = helper.randomString(10) + "-" + file.originalname;
    var key = config.AWS_PHOTOS_PREFIX + "/" + name;
    var params = {
        Bucket: config.AWS_BUCKET_NAME,
        Key: key,
        Body: fileStream,
        ACL: "public-read"
    };
    s3.putObject(params, callback.wrap(function () {
        var params = {Bucket: config.AWS_BUCKET_NAME, Key: key, Expires: 60};
        //create signed url and remove query string
        var url = s3.getSignedUrl('getObject', params);
        url = url.split("?")[0];
        callback(null, url);
    }));
}

module.exports = {
    uploadPhotoToS3: uploadPhotoToS3
};