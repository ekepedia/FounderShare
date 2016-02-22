/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */

/**
 * Post model
 *
 * @author 571555
 * @version 1.1
 *
 * Changes in version 1.1
 * 1. Added _section field to schema
 **/
"use strict";

// Get required modules
var mongoose  = require('mongoose');
var Schema    = mongoose.Schema;
var ObjectId  = Schema.Types.ObjectId;
var _         = require('underscore')

// Get reference Models
var User = require('../../models/User');
User = mongoose.model('User', User);

// Create the Post schema
var postSchema = new Schema({
  _creator: {
    type: ObjectId,
    ref: 'User'
  },
  createDate: {
    type: Date,
    default: Date.now
  },
  updateDate: Date,
  _updater: {
    type: ObjectId,
    ref: 'User'
  },
  subject: String,
  body: String,
  _thread: {
    type: ObjectId,
    ref: 'Post'
  },
  _section: {
    type: ObjectId,
    ref: 'Section'
  }
});

// Increment user.numOfPosts When posts are added
postSchema.post('save', function(post) {
  User.findOne({_id: post._creator}, function(err, user) {
    if (!err && user) {
      // Add post
      user.posts = _.union(user.posts, [post]);
      // Remove duplicated
      user.posts = _.unique(user.posts, false, function(p) {return p.toString()});
      // Adjust posts numbers
      user.numOfPosts = user.posts.length;
      // Save in database
      user.save();
      // Validate posts
      user.updatePosts();
    }
  });
});

// Decrement user.numOfPosts When posts are removed
postSchema.post('remove', function(post) {
  User.findOne({_id: post._creator}, function(err, user) {
    if (!err && user) {
      user.updatePosts();
      user.save();
    }
  });
});

// Add schema to the database
var Post = mongoose.model('Post', postSchema);

// Make the model available to the rest of the application
module.exports = Post;