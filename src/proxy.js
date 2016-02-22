/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */

/**
 * Proxy for api, frontend and mobile
 * @author TCSASSEMBLER
 * @version 1.1
 *
 * Changes in 1.1 (Project Mom and Pop - MiscUpdate5):
 * - Fix code style issues
 */
"use strict";

var http = require("http");
var httpProxy = require('http-proxy');
var proxy = httpProxy.createProxyServer();


http.createServer(function (req, res) {
        var handleError = function (e) {
            res.end(e.toString());
        };
        if (req.url.indexOf("/api/") === 0) {
            req.url = req.url.replace("/api/", "/");
            proxy.web(req, res, {target: 'http://localhost:3000'}, handleError);
        } else if (req.url.indexOf("/mobile/") === 0) {
            req.url = req.url.replace("/mobile/", "/");
            proxy.web(req, res, {target: 'http://localhost:3501'}, handleError);
        } else {
            proxy.web(req, res, {target: 'http://localhost:3500'}, handleError);
	}
    }
).listen(5000, function (err) {
        if (err) {
            throw err;
        }
        console.log("Proxy listening on port 5000");
    });
