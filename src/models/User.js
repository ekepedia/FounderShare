/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */

/**
 * Represents the schema for User.
 *
 * Changes in version 1.1:
 * - Added email verification logic.
 *
 * Changes in version 1.2 (Project Mom and Pop - Release Fall 2015 Assembly):
 * - [PMP-220] Add subscribedToNews
 * - [PMP-233] Add signedUpDate and verifiedDate
 *
 * Changes in version 1.3 (Project Mom and Pop - Forum):
 * - [571555] Add nickname
 * - [571555] Add numOfPosts
 * - [571555] Set default nickname in pre save
 *
 * Changes in version 1.4 (Project Mom and Pop - Forum):
 * - [571555] Added posts array to users
 *
 * @author TCSASSEMBLER
 * @version 1.4
 */
'use strict';

var mongoose = require('mongoose'),
    _ = require('underscore'),
    async = require('async'),
    Const = require("../Const"),
    Schema = mongoose.Schema,
    ObjectId = Schema.Types.ObjectId;


var userSchema = new Schema({
    firstName: {type: String, required: true},
    lastName: String,
    nickname: String,
    posts: [{
        type: ObjectId,
        ref: 'Post'
    }],
    threads: [{
        type: ObjectId,
        ref: 'Thread'
    }],
    numOfPosts: {type: Number, default: 0},
    email: String,
    email_lowered: String,
    location: String,
    picture: String,
    isFirstNamePublic: {type: Boolean, default: true},
    isLastNamePublic: {type: Boolean, default: true},
    isEmailPublic: {type: Boolean, default: true},
    isLocationPublic: {type: Boolean, default: true},
    isPicturePublic: {type: Boolean, default: true},
    subscribedToNews: {type: Boolean, default: false},
    passwordHash: {type: String},
    userRoles: [{
        businessId: ObjectId,
        role: {
            type: String,
            enum: _.values(Const.UserRole)
        }
    }],
    linkedSocialNetwork: {type: String, enum: _.values(Const.SocialNetwork)},
    linkedSocialNetworkUserId: String,
    resetPasswordToken: String,
    resetPasswordExpired: Boolean,
    verifyEmailText: String,
    verifyEmailExpirationDate: {type: Date},
    signedUpDate: {type: Date, required: true, default: Date.now},
    verifiedDate: {type: Date}
});

// Set the default value of this.nickname. If the default is unique, then
// Add it to the database. Otherwise, leave blank.
userSchema.pre('save', function(next){
    var me = this;

    var defaultNickname = this.firstName + this.lastName;

    if (me.nickname) {
        defaultNickname = me.nickname;
    }

    User.find({nickname: defaultNickname}, function(err, user) {
        if (err) {
            return next(err);
        }
        if (!_.isEmpty(user)) {
            // Return will set default to null
            return next();
        } else {
            me.nickname = defaultNickname;
            return next();
        }
    });
});

// Update the numberOfPosts field for user
userSchema.methods.updatePosts = function() {
    var user = this;
    var Post = require('../forum/models/Post');
    var Thread = mongoose.model('Thread');
    async.map(user.posts, function (id, callback) {
      Post.findOne({_id: id}, function(err, post){
        if(!post){
            user.posts = _.without(user.posts, id.toString());
            user.posts.splice(user.posts.indexOf(id),1);
        }
        user.save(function(err){
            if(err)
                callback(err);
            else
                callback(null);
        });
      });
    }, function (err) {
        async.map(user.threads, function (id, callback) {
          Thread.findOne({_id: id}, function(err, thread){
            if(!thread){
                user.threads = _.without(user.threads, id.toString());
                user.threads.splice(user.threads.indexOf(id),1);
            }
            user.save(function(err){
                if(err)
                    callback(err);
                else
                    callback(null);
            });
          });
        }, function (err) {
            user.numOfPosts = user.posts.length + user.threads.length;
            user.save();
        });
    });
}

var User = mongoose.model('User', userSchema);

module.exports = userSchema;

