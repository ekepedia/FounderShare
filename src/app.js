/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */

/**
 * This is the startup script for web server.
 * @author TCSASSEMBLER
 * @version 1.3
 * 
 * Changes in 1.1 (Project Mom and Pop - Gift Card Offers Search and View):
 * - enable 'trust proxy'
 *
 * Changes in 1.2 (Project Mom and Pop - MiscUpdate5):
 * - Fix missing ';' error
 *
 * Changes in 1.3 (Project Mom and Pop - Forum):
 * - Added code to initiate forum
 */
"use strict";

var config = require('config');
var passport = require('passport');
var _ = require('underscore');
var multer = require('multer');
var express = require('express');
var winston = require('winston');
var cors = require('cors');
var bodyParser = require('body-parser');
var logging = require('./common/logging');
var BearerStrategy = require('passport-http-bearer');
var ForbiddenError = require("./common/errors").ForbiddenError;
var UnauthorizedError = require("./common/errors").UnauthorizedError;
var SecurityService = require("./services/SecurityService");

passport.use(new BearerStrategy(
    function (token, done) {
        SecurityService.authenticateWithSessionToken(token, function (err, user, expiration) {
            if (err) {
                return done(err);
            }
            user.sessionExpiration = expiration;
            user.sessionToken = token;
            return done(null, user, {scope: 'all'});
        });
    }
));

var app = express();
app.set('port', config.WEB_SERVER_PORT);

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(multer());
app.use(passport.initialize());

// Initiate forum
require('./forum/forum')(app, passport);

app.enable('trust proxy');

//load all routes
_.each(require("./routes"), function (verbs, url) {
    _.each(verbs, function (def, verb) {
        var actions = [
            function (req, res, next) {
                req.signature = def.controller + "#" + def.method;
                next();
            }
        ];
        //authenticate with bearer token
        //authentication is optional, but require if `public` is not true
        actions.push(function (req, res, next) {
            passport.authenticate('bearer', {session: false}, function (err, user) {
                if (err) {
                    return next(err);
                }
                if (user) {
                    req.user = user;
                    next();
                } else {
                    if (def.public) {
                        next();
                    } else {
                        next(new UnauthorizedError("Action not allowed for anonymous"));
                    }
                }
            })(req, res, next);
        });
        //fix user object and add expiration time to response
        actions.push(function (req, res, next) {
            if (!req.user) {
                return next();
            }
            res.header('Session-Expires-In', req.user.sessionExpiration - new Date().getTime());
            req.sessionToken = req.user.sessionToken;
            delete req.user.sessionExpiration;
            delete req.user.sessionToken;
            next();
        });
        //check permissions
        actions.push(function (req, res, next) {
            if (!req.user) {
                return next();
            }
            if (def.roles) {
                var hasAccess = _.any(def.roles, function (role) {
                    return _.findWhere(req.user.userRoles, {role: role});
                });
                if (!hasAccess) {
                    return next(new ForbiddenError("You are not allowed to perform this operation."));
                }
            }
            //set associated business (if contains any)
            _.each(req.user.userRoles, function (userRole) {
                if (userRole.businessId) {
                    req.user.businessId = String(userRole.businessId);
                }
            });
            next();
        });
        var method = require("./controllers/" + def.controller)[def.method];
        if (!method) {
            throw new Error(def.method + " is undefined");
        }
        actions.push(method);
        app[verb](url, actions);
    });
});

app.get("/echo", function (req, res) {
    res.json({
        ip: req.ip,
        headers: req.headers,
        time: new Date()
    });
});

app.use(function (req, res) {
    res.status(404).json({error: "route not found"});
});

app.use(logging.errorHandler);

app.listen(app.get('port'), function () {
    winston.info('Express server listening on port ' + app.get('port'));
    if (config.ENABLED_PROXY) {
        require("./proxy");
    }
});

module.exports = app;
