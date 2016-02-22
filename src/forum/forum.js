/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */
/**
 * Initiate forum
 * @version 1.0
 * @author 571555
 */
"use strict";

module.exports = function(app, passport) {
  // Get routes
  var forum = require('./routes/forum');

  // Middleware to authenticate
  app.use('/forum', function(req, res, next) {
    passport.authenticate('bearer', {session: false}, function (err, user) {
        if (err) {
            return res.status(500).json({
              success: false,
              message: err
            });
        }
        if (user) {
            req.user = user;
            next();
        } else {
          next();
        }
    })(req, res, next);
  });

  // Middleware to add pagination
  app.use('/forum', function(req, res, next) {
    // Set limit
    if (req.query.limit) {
      req.limit = JSON.parse(req.query.limit);
    } else {
      req.limit = require('../Const').DEFAULT_QUERY_LIMIT;
    }

    // Set offset
    if (req.query.offset) {
      req.offset = JSON.parse(req.query.offset);
    } else {
      req.offset = require('../Const').DEFAULT_QUERY_OFFSET;
    }

    // Set search
    if (req.query.search) {
      req.search = req.query.search.split(' ');
    }

    // Move on
    return next();
  });

  // Add routes to app
  app.use('/forum', forum);

  return;
};