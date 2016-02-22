/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */

/**
 * The base configuration file
 *
 * @author TCSASSEMBLER
 * @version 1.6
 *
 * Changes in 1.1:
 * 1. add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER, GIFT_EXPIRATION_DAYS,
 *        JOB_GIFTS_INTERVAL, GIFT_DELIVERED_DAYS
 * Changes in 1.2:
 *  - Added JOB_GIFT_CARD_OFFER_INTERVAL, USER_EMAIL_VERIFIED_INTERVAL
 * Changes in 1.3:
 * 1. Add BITLY_ACCESS_TOKEN
 * 2. Fix links to use local.foundershare domain
 * 3. Fix braintree to working settings
 *
 * Changes in version 1.4
 * - Add SKIP_PLATFORM_ADMIN_DELETE
 *
 * Changes in version 1.5 (Project Mom and Pop - Gift Card Offers Search and View)
 * - Add: MOCK_LOCALHOST_IP, GIFT_OFFER_DISTANCE_SEARCH_RANGES, IP_LOCATION_CACHE_SECONDS
 *
 * Changes in version 1.6 (Project Mom and Pop - MiscUpdate5):
 * - BUSINESS_CONDITION is now a plain string as opposed to array of strings
 */
'use strict';
var braintree = require("braintree");

var MINUTE = 60 * 1000;
var HOUR = 60 * 60 * 1000;
var DAY = 24 * HOUR;

module.exports = {
    "MONGODB_URL": "mongodb://localhost:27017/project-mom-new",
    "VERIFY_EMAIL_URL_PREFIX": "http://localhost:5000",
    "SALT_WORK_FACTOR": 1,
    "SESSION_TOKEN_DURATION": 30 * DAY,
    "OFFER_EXPIRATION_DAYS": 90,
    GIFT_EXPIRATION_DAYS: 30,
    MAX_QUANTITY: 2000,
    // USER_EMAIL_EXPIRATION_DAYS: 30,
    GIFT_DELIVERED_DAYS: 1,
    JOB_GIFTS_INTERVAL: 10 * MINUTE,
    JOB_GIFT_CARD_OFFER_INTERVAL: DAY,
    USER_EMAIL_VERIFIED_INTERVAL: DAY,
    IP_LOCATION_CACHE_SECONDS: 5 * DAY / 1000,
    "WEB_SERVER_PORT": 3000,
    "TWITTER_CONSUMER_KEY": "F3NKka0bEk7aFGmtW7mpKepMG",
    "TWITTER_CONSUMER_SECRET": "OGkIUsKexAqbvAkWYmIJVyooGmXGpS6N59uDvKRTCNlWTZUq97",
    "GEOCODER_PROVIDER": "google",
    "GEOCODER_HTTPADAPTER": "http",
    "SMTP_HOST": "smtp.mailgun.org",
    "SMTP_PORT": 587,
    SMTP_USERNAME: 'postmaster@sandboxf26b0643299c47d29482b550fc447e85.mailgun.org',
    SMTP_PASSWORD: 'a24d5ad933156edc6f88b5761dc080e1',
    "CONFIG_EMAIL": "hi.there@foundershare.com",
    "SITE_ADMIN_EMAIL": "support@foundershare.com",
    DESKTOP_APP_URL: "http://local.foundershare.com:5000",
    MOBILE_APP_URL: "http://local.foundershare.com:5000/mobile/",
    BRAINTREE_SUBSCRIPTION_PLANID: "plan",
    BRAINTREE_MERCHANT_ACCOUNT_ID: "9vbrnfsp9cpx8kwc",
    "BRAINTREE_GATEWAY_CONFIG": {
        environment: braintree.Environment.Sandbox,
        "merchantId": "h858q7btyjrjswpw",
        "publicKey": "9dccvjzwvfsrycq4",
        "privateKey": "134ea8e44746ddaa3a7ec403743d7043"
    },
    AWS: {
        accessKeyId: "<update>",
        secretAccessKey: "<update>",
        region: "<update>"
    },
    AWS_BUCKET_NAME: "<update>",
    AWS_PHOTOS_PREFIX: "photos",
    BUSINESS_CONDITION:
        "A Founder$hare may only be redeemed through a smartphone.\n" +
        "A Founder$hare does not have any service or inactivity fees of any type.",
    TWILIO_ACCOUNT_SID: "<update>",
    TWILIO_AUTH_TOKEN: "<update>",
    TWILIO_FROM_NUMBER: "<update>",
    BITLY_ACCESS_TOKEN: "207427824ba65e9e64bf2d2ca5d750e33bc6e1b6",
    SKIP_PLATFORM_ADMIN_DELETE: "tammy.ferris",
    MOCK_LOCALHOST_IP: "199.16.159.8",
    GIFT_OFFER_DISTANCE_SEARCH_RANGES: [10000, 50000],
    ENABLED_PROXY: true
};
