/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */
/**
 * Generate real business data based from Yelp API
 *
 * @version 1.0
 * @author TCSASSEMBLER
 */
'use strict';


var async = require('async');
var fs = require('fs');
var _ = require('underscore');

var yelp = require("yelp").createClient({
    consumer_key: "m_31MBbH7S3pywDhrWwPXQ",
    consumer_secret: "qqudPEFkZQXf3pR106iRslXv0xU",
    token: "GswtjGMRwObIY1B8d8vm5esLseE11b-A",
    token_secret: "Fr2pt8mMGrGPjfhOHaKFjPrsQrc"
});

var queries = [
    {location: "San Francisco, CA", category_filter: "pizza", offset: 0, limit: 20},
    {location: "San Francisco, CA", category_filter: "pizza", offset: 50, limit: 20},
    {location: "San Francisco, CA", category_filter: "pizza", offset: 100, limit: 20},
    {location: "San Francisco, CA", category_filter: "coffee", offset: 0, limit: 20},
    {location: "San Francisco, CA", category_filter: "coffee", offset: 50, limit: 20},
    {location: "San Francisco, CA", category_filter: "coffee", offset: 100, limit: 20},
    {location: "San Francisco, CA", category_filter: "fashion", offset: 0, limit: 20},
    {location: "San Francisco, CA", category_filter: "fashion", offset: 50, limit: 20},
    {location: "San Francisco, CA", category_filter: "fashion", offset: 100, limit: 20},

    {location: "Los Angeles, CA", category_filter: "pizza", offset: 0, limit: 20},
    {location: "Los Angeles, CA", category_filter: "pizza", offset: 50, limit: 20},
    {location: "Los Angeles, CA", category_filter: "pizza", offset: 100, limit: 20},
    {location: "Los Angeles, CA", category_filter: "coffee", offset: 0, limit: 20},
    {location: "Los Angeles, CA", category_filter: "coffee", offset: 50, limit: 20},
    {location: "Los Angeles, CA", category_filter: "coffee", offset: 100, limit: 20},
    {location: "Los Angeles, CA", category_filter: "fashion", offset: 0, limit: 20},
    {location: "Los Angeles, CA", category_filter: "fashion", offset: 50, limit: 20},
    {location: "Los Angeles, CA", category_filter: "fashion", offset: 100, limit: 20},

    {location: "New York, NY", category_filter: "pizza", offset: 0, limit: 20},
    {location: "New York, NY", category_filter: "pizza", offset: 50, limit: 20},
    {location: "New York, NY", category_filter: "pizza", offset: 100, limit: 20},
    {location: "New York, NY", category_filter: "coffee", offset: 0, limit: 20},
    {location: "New York, NY", category_filter: "coffee", offset: 50, limit: 20},
    {location: "New York, NY", category_filter: "coffee", offset: 100, limit: 20},
    {location: "New York, NY", category_filter: "fashion", offset: 0, limit: 20},
    {location: "New York, NY", category_filter: "fashion", offset: 50, limit: 20},
    {location: "New York, NY", category_filter: "fashion", offset: 100, limit: 20}
];

var businesses = [];

var category2Id = {
    pizza: 1,
    coffee: 2,
    fashion: 3
};

async.forEach(queries, function (query, cb) {
    yelp.search(query, function(error, data) {
        if (error) {
            console.log(error);
            throw error;
        }
        _.each(data.businesses, function (item) {
            if (!item.image_url) {
                return;
            }
            var business = {
                name: item.name,
                type: category2Id[query.category_filter],
                streetAddress: item.location.address.join(" "),
                city: item.location.city,
                state: item.location.state_code,
                country: item.location.country_code,
                zip: item.location.postal_code,
                telephoneNumber: item.display_phone || "+1-1234",
                picture: item.image_url,
                businessHours: "24h",
                description: item.snippet_text,
                website: item.url,
                coordinates: [item.location.coordinate.longitude, item.location.coordinate.latitude]
            };
            businesses.push(business);
        });
        cb();
    });
}, function () {
    fs.writeFileSync(__dirname + "/data/yelp-businesses.json", JSON.stringify(businesses, null, 4));
    console.log("Added",businesses.length, "Businesses");
    process.exit(0);
});
