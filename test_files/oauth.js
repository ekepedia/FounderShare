/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */
/**
 * Use this script to create oauth server and generate social access tokens.
 *
 * @version 1.0
 * @author TCSASSEMBLER
 */
'use strict';

var config = require('config');
var passport = require('passport');
var FacebookStrategy = require("passport-facebook");
var TwitterStrategy = require("passport-twitter");
var LinkedInStrategy = require("passport-linkedin-oauth2").Strategy;
var express = require('express');
var session = require('express-session');
var app = express();
app.set('port', 5000);

app.use(session({secret: "secr3t", resave: true, saveUninitialized: true }));
passport.use(new FacebookStrategy({
        clientID: "847993525269234",
        clientSecret: "81cc53e074cda1cce9669390d4dc2750",
        callbackURL: "http://localhost:5000/facebook/callback",
        enableProof: false
    },
    function (accessToken, refreshToken, profile, done) {
        done(null, {
            accessToken: accessToken
        });
    }
));

passport.use(new TwitterStrategy({
        consumerKey: config.TWITTER_CONSUMER_KEY,
        consumerSecret: config.TWITTER_CONSUMER_SECRET,
        callbackURL: "http://localhost:5000/twitter/callback"
    },
    function (token, tokenSecret, profile, done) {
        done(null, {
            accessToken: new Buffer(token + ":" + tokenSecret).toString("base64")
        });
    }
));
passport.use(new LinkedInStrategy({
    clientID: "75bfedn3v85xvw",
    clientSecret: "TYVFgGgC3jn2pKlY",
    callbackURL: "http://localhost:5000/linkedin/callback",
    scope: ['r_emailaddress', 'r_basicprofile']
}, function (accessToken, refreshToken, profile, done) {
    console.log(arguments);
    done(null, {
        accessToken: accessToken
    });
}));

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (user, done) {
    done(null, user);
});
app.use(passport.initialize());
app.get('/facebook',
    passport.authenticate('facebook', {scope: ['email']}));

app.get('/facebook/callback',
    passport.authenticate('facebook', {failureRedirect: '/login'}),
    function (req, res) {
        res.json(req.user);
    });
app.get('/twitter',
    passport.authenticate('twitter', {scope: []}));

app.get('/twitter/callback',
    passport.authenticate('twitter', {failureRedirect: '/login'}),
    function (req, res) {
        res.json(req.user);
    });
app.get('/linkedin',
    passport.authenticate('linkedin', {state: 'state'}));

app.get('/linkedin/callback',
    passport.authenticate('linkedin', {failureRedirect: '/login'}),
    function (req, res) {
        res.json(req.user);
    });

app.listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});