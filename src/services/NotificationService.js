/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */
/**
 * This service provides methods to send email notifications.
 *
 * @version 1.4
 * @author TCSASSEMBLER
 *
 * Changes in 1.1:
 * 1. Add sendEmail, sendSMS
 * 2. Rename _renderEmailTemplate to renderTemplate and make it public
 *
 * Changes in 1.2:
 *  - Added notifyUserOfReceipt() method.
 *
 * Changes in 1.3
 * - Add addPlatformEmployee
 *
 * Changes in version 1.4 (Project Mom and Pop - Release Fall 2015 Assembly):
 * - [PMP-230] Email gift card to owner
 * - Set map zoom factor to 16
 */
'use strict';

var async = require('async');
var config = require('config');
var fs = require('fs');
var jade = require('jade');
var path = require('path');
var request = require('superagent');
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var smsClient = require('twilio')(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);
var qrCode = require('../common/qrcode');
var validate = require("../common/validator").validate;
var logging = require("../common/logging");
var helper = require("../common/helper");
var BadRequestError = require("../common/errors").BadRequestError;
var Business = require("../models/").Business;
var User = require("../models/").User;
var FeedbackType = require("../models/").FeedbackType;
var GiftCardOffer = require("../models/").GiftCardOffer;
var GiftCardOfferComment = require("../models/").GiftCardOfferComment;
var Const = require('../Const');

/**
 * Get nodemailer transporter for sending emails.
 * @returns {Object} an smtp transport object to send emails.
 * @private
 */
function _getTransporter() {
    return nodemailer.createTransport(smtpTransport({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        auth: {
            user: config.SMTP_USERNAME,
            pass: config.SMTP_PASSWORD
        }
    }));
}

/**
 * Render template from jade templates.
 * @param {String} templateName The jade template filename you want to render. If the filename invite-friend.jade, it should be 'invite-friend'.
 * @param {Object} context The object that you want to interpolate to the template.
 * @param {function(Error, String)} callback the callback function with arguments
 * - the error
 * - the html content
 */
function renderTemplate(templateName, context, callback) {
    var error = validate(
        {templateName: templateName, context: context},
        {
            templateName: "string",
            context: {type: "AnyObject",  required: false}
        });
    if (error) {
        return callback(error);
    }
    var filePath = path.join(__dirname, "../../views/templates/" + templateName + '.jade');
    fs.readFile(filePath, 'utf8', callback.wrap(function (file) {
        var compiledTemplate = jade.compile(file, {filename: filePath});
        var html = compiledTemplate(context);
        callback(null, html);
    }));
}

/**
 * Send mail function.
 * @param {String} from The sender of the email.
 * @param {String} to The receiver of the email. It should be a valid email.
 * @param {String} subject The subject of the email.
 * @param {String} html The content of the email in html format.
 * @param {Array} attachments An optional attachment array.
 * @param {function(Error)} callback the callback function with arguments
 * - the error
 * @private
 */
function _sendMail(from, to, subject, html, attachments, callback) {
    var mailOptions = {
        from: from,
        to: to,
        subject: subject,
        html: html
    };
    if (attachments) {
	mailOptions.attachments = attachments;
    }
    var transporter = _getTransporter();
    transporter.sendMail(mailOptions, callback.errorOnly());
}

/**
 * Get user's email or format a message if user is anonymous
 * @param {ObjectId} [userId] the user Id
 * @param {function(Error, String)} callback the callback function with arguments
 * - the error
 * - the text message
 * @private
 */
function _formatEmail(userId, callback) {
    async.waterfall([
        function (cb) {
            if (userId) {
                helper.ensureExists(User, userId, cb);
            } else {
                cb(null, null);
            }
        }, function (user, cb) {
            var msg;
            if (!user) {
                msg = "anonymous";
            } else if (!user.email) {
                msg = "user (" + user.id + ") hasn't provided the email address yet.";
            } else {
                msg = user.email;
            }
            cb(null, msg);
        }
    ], callback);
}

/**
 * Service for users to reset their password.
 * @param {String} email The user's email.
 * @param {String} resetLink The reset link.
 * @param {function(Error)} callback the callback function with arguments
 * - the error
 */
function notifyUserOfPassword(email, resetLink, callback) {
    var error = validate(
        {email: email, resetLink: resetLink},
        {email: "email", resetLink: "ShortString"});
    if (error) {
        return callback(error);
    }
    var sender = config.CONFIG_EMAIL;
    var receiver = email;
    var subject = 'Password Change';
    var content = 'Click this link to reset your password: ' + resetLink;
    _sendMail(sender, receiver, subject, content, null, callback);
}

/**
 * Service to notify admin about a new feedback via email.
 * @param {Object} feedback The feedback object.
 * @param {function(Error)} callback the callback function with arguments
 * - the error
 */
function notifyAdminOfFeedback(feedback, callback) {
    var error = validate(
        {feedback: feedback},
        {
            feedback: {
                __obj: true,
                userId: "ObjectId?",
                subject: "ShortString",
                message: "LongString",
                type: "IntegerId"
            }
        });
    if (error) {
        return callback(error);
    }
    async.waterfall([
        function (cb) {
            _formatEmail(feedback.userId, cb);
        }, function (email, cb) {
            feedback.email = email;
            helper.ensureExists(FeedbackType, feedback.type, cb);
        }, function (feedbackType, cb) {
            feedback.type = feedbackType.name;
            renderTemplate("feedback", feedback, cb);
        }, function (html, cb) {
            _sendMail(config.CONFIG_EMAIL, config.SITE_ADMIN_EMAIL, feedback.subject, html, null, cb);
        }
    ], callback.errorOnly());
}

/**
 * Service to notify admin about a new reported abuse via admin.
 * @param {Object} reportedAbuse The feedback object.
 * @param {function(Error)} callback the callback function with arguments
 * - the error
 */
function notifyAdminOfReportedAbuse(reportedAbuse, callback) {
    var error = validate(
        {reportedAbuse: reportedAbuse},
        {
            reportedAbuse: {
                userId: "ObjectId?",
                issue: "ShortString",
                description: "LongString",
                commentId: "ObjectId?",
                giftCardOfferId: "ObjectId?"
            }
        });
    if (error) {
        return callback(error);
    }

    async.waterfall([
        function (cb) {
            _formatEmail(reportedAbuse.userId, cb);
        }, function (email, cb) {
            reportedAbuse.email = email;
            if (reportedAbuse.commentId) {
                helper.ensureExists(GiftCardOfferComment, reportedAbuse.commentId, cb.errorOnly());
            } else {
                cb();
            }
        }, function (cb) {
            if (reportedAbuse.giftCardOfferId) {
                helper.ensureExists(GiftCardOffer, reportedAbuse.giftCardOfferId, cb.errorOnly());
            } else {
                cb();
            }
        }, function (cb) {
            renderTemplate('reported-abuse', reportedAbuse, cb);
        }, function (html, cb) {
            _sendMail(config.CONFIG_EMAIL, config.SITE_ADMIN_EMAIL, 'Reported Abuse', html, null, cb);
        }
    ], callback.errorOnly());
}

/**
 * Service for users to invite their friends via email.
 * @param {Object} friendInvitation The friend invitation object.
 * @param {function(Error)} callback the callback function with arguments
 * - the error
 */
function notifyUserOfInvitation(friendInvitation, callback) {
    var error = validate(
        {friendInvitation: friendInvitation},
        {
            friendInvitation: {
                userId: "ObjectId",
                friendEmail: "email",
                offerId: "ObjectId",
                offerTitle: "LongString"
            }
        });
    if (error) {
        return callback(error);
    }
    async.waterfall([
        function (cb) {
            helper.ensureExists(User, friendInvitation.userId, cb);
        }, function (user, cb) {
            if (!user.email) {
                return cb(new BadRequestError("Cannot invite friend. Please update your profile and set your email address."));
            }
            friendInvitation.userEmail = user.email;
            renderTemplate('invite-friend', friendInvitation, cb);
        }, function (html, cb) {
            var subject = 'Invitation from Your Friend ' + friendInvitation.userEmail;
            _sendMail(config.CONFIG_EMAIL, friendInvitation.friendEmail, subject, html, null, cb);
        }
    ], callback.errorOnly());
}

/**
 * Send the payment receipt.
 *
 * @param paymentResult the payment result.
 * @param userId the user id
 * @param callback the callback method.
 */
function notifyUserOfReceipt(paymentResult, userId, giftCard, callback) {
    var email, user, business, attachments = [];
    async.waterfall([
        function (cb) {
            helper.ensureExists(User, userId, cb);
        }, function (result, cb) {
	    user = result;
	    Business.findById(giftCard.businessId, cb);
	}, function (result, cb) {
	    business = result;
	    paymentResult.transaction.businessStreetAddress = business.streetAddress;
	    paymentResult.transaction.businessCity = business.city;
	    paymentResult.transaction.businessState = business.state;
	    paymentResult.transaction.businessZip = business.zip;
	    // maker coordinates have the form "lat,lng"
	    var url = 'https://maps.googleapis.com/maps/api/staticmap?zoom=16&size=400x400&markers=' + business.coordinates[1] + ',' + business.coordinates[0];
	    request
		.get(url)
		.end(cb);
	}, function (result, cb) {
	    attachments.push({
		filename: 'map.png',
		content: result.body,
		cid: 'gmap'
	    });
	    var qr = qrCode.qrcode(4, 'H');
	    qr.addData(giftCard.currentQRCode);
	    qr.make();
	    attachments.push({
		filename: 'qrcode.gif',
		content: new Buffer(qr.createStream(4).toByteArray()),
		cid: 'qrcode'
	    });
	    if (user && user.email) {
		email = user.email;
                paymentResult.transaction.userFirstName = user.firstName;
		renderTemplate('receipt', paymentResult.transaction, cb);
            } else {
                cb(null, null);
            }

        }, function (html, cb) {
            if (email) {
                var subject = 'Transaction receipt for ' + giftCard.readableId;
                _sendMail(config.CONFIG_EMAIL, email, subject, html, attachments, cb);
            } else {
                cb();
            }
        }
    ], callback.errorOnly());
}

/**
 * Send email to notify user of removed comment.
 * @param comment the removed comment instance
 * @param userId the user id
 * @param callback the callback method
 */
function notifyUserOfRemoveComment(comment, userId, callback) {
    var email;
    async.waterfall([
        function (cb) {
            helper.ensureExists(User, userId, cb);
        }, function (user, cb) {
            if (user.email) {
                email = user.email;
                renderTemplate('remove-comment', comment, cb);
            } else {
                cb(null, null);
            }
        }, function (html, cb) {
            if (email) {
                var subject = 'Gift Card Offer Comment Is Removed';
                _sendMail(config.CONFIG_EMAIL, email, subject, html, null, cb);
            } else {
                cb();
            }
        }
    ], callback.errorOnly());
}
/**
 * Send email to notify of removed gift card offer
 * @param offer the offer instance
 * @param callback the callback method
 */
function notifyUserOfRemoveOffer(offer, callback) {
    var email;
    async.waterfall([
        function (cb) {
            User.find({
                'userRoles.businessId': offer.businessId,
                'userRoles.role': Const.UserRole.BUSINESS_ADMIN
            }, cb);
        }, function (users, cb) {
            if (users && users.length > 0 && users[0].email) {
                email = users[0].email;
                renderTemplate('remove-offer', offer, cb);
            } else {
                cb(null, null);
            }
        }, function (html, cb) {
            if (email) {
                var subject = 'Gift Card Offer Is Removed';
                _sendMail(config.CONFIG_EMAIL, email, subject, html, null, cb);
            } else {
                cb();
            }
        }
    ], callback.errorOnly());
}

/**
 * Send email to notify of accepted giftCard
 * @param giftCard the GiftCard instance
 * @param callback the callback method
 */
function notifyUserOfAcceptedGiftCard(giftCard, callback) {
    var email, user, business, attachments = [];
    async.waterfall([
        function (cb) {
            User.findById(giftCard.ownerId, cb);
        }, function (result, cb) {
	    user = result;
	    Business.findById(giftCard.businessId, cb);
	}, function (result, cb) {
	    business = result;
	    // maker coordinates have the form "lat,lng"
	    var url = 'https://maps.googleapis.com/maps/api/staticmap?zoom=16&size=400x400&markers=' + business.coordinates[1] + ',' + business.coordinates[0];
	    request
		.get(url)
		.end(cb);
	}, function (result, cb) {
	    attachments.push({
		filename: 'map.png',
		content: result.body,
		cid: 'gmap'
	    });
	    var qr = qrCode.qrcode(4, 'H');
	    qr.addData(giftCard.currentQRCode);
	    qr.make();
	    attachments.push({
		filename: 'qrcode.gif',
		content: new Buffer(qr.createStream(4).toByteArray()),
		cid: 'qrcode'
	    });
	    if (user && user.email) {
                email = user.email;
		var data = {
		    gift: giftCard,
		    user: user,
		    business: business
		};
                renderTemplate('your-gift-card', data, cb);
            } else {
                cb(null, null);
            }
        }, function (html, cb) {
            if (email) {
                var subject = 'Your F$ ' + giftCard.readableId + ' for ' +
		    giftCard.businessName;
                _sendMail(config.CONFIG_EMAIL, email, subject, html, attachments, cb);
            } else {
                cb();
            }
        }
    ], callback.errorOnly());
}

/**
 * Send an email
 * @param {String} toEmail the target email address
 * @param {String} templateName the template to render
 * @param {Object} values the values to render in template
 * @param {function(Error, Object)} callback the callback function with arguments
 * - the error
 * - the status of a sent email
 * @since 1.1
 */
function sendEmail(toEmail, templateName, values, callback) {
    var error = validate(
        {toEmail: toEmail, templateName: templateName, values: values},
        {
            toEmail: "email",
            templateName: "string",
            values: {type: "AnyObject",  required: false}
        });
    if (error) {
        return callback(error);
    }
    async.parallel({
        subject: function (cb) {
            renderTemplate(templateName + "_subject", values || {}, cb);
        },
        body: function (cb) {
            renderTemplate(templateName, values || {}, cb);
        }
    }, callback.wrap(function (result) {
        var transporter = _getTransporter();
        transporter.sendMail({
            from: config.CONFIG_EMAIL,
            to: toEmail,
            subject: result.subject,
            html: result.body
        }, callback);
    }));
}

/**
 * Send an sms
 * @param {String} toNumber the target phone number
 * @param {String} templateName the template to render
 * @param {Object} values the values to render in template
 * @param {function(Error, Object)} callback the callback function with arguments
 * - the error
 * - the status of a sent sms
 * @since 1.1
 */
function sendSMS(toNumber, templateName, values, callback) {
    var error = validate(
        {toNumber: toNumber, templateName: templateName, values: values},
        {
            toNumber: "string",
            templateName: "string",
            values: {type: "AnyObject",  required: false}
        });
    if (error) {
        return callback(error);
    }

    renderTemplate(templateName, values || {}, callback.wrap(function (content) {
        smsClient.sendMessage({
            to: toNumber,
            from: config.TWILIO_FROM_NUMBER,
            body: content
        }, callback);
    }));
}

/**
 * Notify user that they have been added as platform employee by another employee/admin
 * @param {String} email The user's email.
 * @param {String} verificationLink Link to verify user account
 * @param {function(Error)} callback the callback function with arguments
 * - the error
 */
function addPlatformEmployee(email, verificationLink, callback) {
    var error = validate(
        {email: email, verificationLink: verificationLink},
        {email: "email", verificationLink: "ShortString"});
    if (error) {
        return callback(error);
    }
    var sender = config.CONFIG_EMAIL;
    var receiver = email;
    var subject = 'Activate your account';
    var content = 'Click this link to activate your password: ' + verificationLink;
    _sendMail(sender, receiver, subject, content, null, callback);
}

module.exports = {
    notifyUserOfPassword: logging.createWrapper(notifyUserOfPassword, {
        input: ["email", "resetLink"],
        output: [],
        signature: "NotificationService#notifyUserOfPassword"
    }),
    notifyAdminOfFeedback: logging.createWrapper(notifyAdminOfFeedback, {
        input: ["feedback"],
        output: [],
        signature: "NotificationService#notifyAdminOfFeedback"
    }),
    notifyAdminOfReportedAbuse: logging.createWrapper(notifyAdminOfReportedAbuse, {
        input: ["reportedAbuse"],
        output: [],
        signature: "NotificationService#notifyAdminOfReportedAbuse"
    }),
    notifyUserOfInvitation: logging.createWrapper(notifyUserOfInvitation, {
        input: ["friendInvitation"],
        output: [],
        signature: "NotificationService#notifyUserOfInvitation"
    }),
    notifyUserOfReceipt: logging.createWrapper(notifyUserOfReceipt, {
        input: ["paymentResult", "userId", "giftCard"],
        output: [],
        signature: "NotificationService#notifyUserOfReceipt"
    }),
    notifyUserOfRemoveOffer: logging.createWrapper(notifyUserOfRemoveOffer, {
        input: ["offer"],
        output: [],
        signature: "NotificationService#notifyUserOfRemoveOffer"
    }),
    notifyUserOfAcceptedGiftCard: logging.createWrapper(notifyUserOfAcceptedGiftCard, {
        input: ["giftCard"],
        output: [],
        signature: "NotificationService#notifyUserOfAcceptedGiftCard"
    }),
    notifyUserOfRemoveComment: logging.createWrapper(notifyUserOfRemoveComment, {
        input: ["comment", "userId"],
        output: [],
        signature: "NotificationService#notifyUserOfRemoveComment"
    }),
    sendEmail: logging.createWrapper(sendEmail, {
        input: ["toEmail", "templateName", "values"],
        output: ["response"],
        signature: "NotificationService#sendEmail"
    }),
    sendSMS: logging.createWrapper(sendSMS, {
        input: ["toNumber", "templateName", "values"],
        output: ["response"],
        signature: "NotificationService#sendSMS"
    }),
    renderTemplate: logging.createWrapper(renderTemplate, {
        input: ["templateName", "context"],
        output: ["content"],
        signature: "NotificationService#renderTemplate"
    }),
    addPlatformEmployee: logging.createWrapper(addPlatformEmployee, {
        input: ["email", "verificationLink"],
        logInput: false,
        output: [],
        signature: "NotificationService#addPlatformEmployee"
    })
};
