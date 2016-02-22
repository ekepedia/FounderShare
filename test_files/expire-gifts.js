/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */
/**
 * Use this script to set createdAt date to past date in all GiftCardGifts
 *
 * @version 1.0
 * @author TCSASSEMBLER
 */
'use strict';


var GiftCardGift = require('../src/models').GiftCardGift;

GiftCardGift.update({status: "PENDING"}, {createdAt: new Date(2010, 0, 1)}, {multi: true}, function (err, count) {
    if (err) {
        console.log(err);
        throw err;
    }
    console.log('expired ' + count + " gift(s)");
    process.exit(0);
});