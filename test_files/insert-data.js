/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */
/**
 * Clear and generate test data
 *
 * @version 1.0
 * @author TCSASSEMBLER
 */
'use strict';

var async = require('async');
var _ = require('underscore');
var mongoose = require('mongoose');
var models = require("../src/models");

/* Drop the DB */
mongoose.connection.db.dropDatabase();

async.waterfall([
    function (cb) {
        async.forEach(_.values(models), function (model, cb) {
            model.remove({}, cb);
        }, cb);
    }, function (cb) {
        async.forEach(_.values(models), function (model, cb) {
            var data = require("./data/" + model.modelName + ".json");
            model.create(data, cb);
        }, cb);
    }
], function (err) {
    if (err) {
        console.log(JSON.stringify(err, null, 4));
        console.log(err.stack);
        console.log(err);
        process.exit(0);
    }
    console.log("Data inserted successfully");
    process.exit(0);
});
