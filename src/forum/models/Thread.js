/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */

/**
 * Thread model
 *
 * @author 571555
 * @version 1.1
 * 
 * Changes in version 1.1
 * 1. Added last post functionality
 * 2. Added _section field to Post objects
 *
 **/
"use strict";

// Get required modules
var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;
var ObjectId     = Schema.Types.ObjectId;
var _            = require('underscore');
var async        = require('async');
var deepPopulate = require('mongoose-deep-populate')(mongoose);

// Get referenced models
var Post    = require('./Post');
var User    = require('../../models/User');

// Model User database to use in references
mongoose.model('User', User);

// Create the Thread schema
var threadSchema = new Schema({
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
  posts: [{
    type: ObjectId,
    ref: 'Post'
  }],
  subject: String,
  body: String,
  replies: {
    type: Number,
    default: 0
  },
  viewers: [{
    type: ObjectId,
    ref: 'User'
  }],
  views: Number,
  _section: {
    type: ObjectId,
    ref: 'Section'
  },
  lastPost: {
    type: ObjectId,
    ref: 'Post'
  },
  tags: [String]
});

// Add post
// @params
//   - _creator           : id of the User
//   - subject            : the subject of the post
//   - body               : the body of the post
//   - done(err, post) : callback function
//       - err  : Any errors
//       - post : the new post object
threadSchema.methods.addPost = function(_creator, subject, body, done) {
  var thread = this;
  // Validate parameters
  if (!_creator)
    return done('_creator is required');
  if (!subject)
    return done('subject is required');
  if (!body)
    return done('body is required');
  if (!done || !_.isFunction(done))
    return done('done is require and must be a callable function');
  
  var newPost = new Post({
    _creator: _creator,
    subject:  subject,
    body:     body,
    _thread:  this._id,
    _section: this._section 
  });

  newPost.save(function(err) {
    if (err)
      return done(err);

    thread.posts.push(newPost._id);
    thread.replies = thread.posts.length;
    thread.lastPost = newPost._id;

    thread.save(function(err) {
      if (err)
        return done(err);

      thread.updateViews(_creator);

      return done(null, newPost);
      
    });
  });
};

// Remove post
// @params
//   - _post           : id of the post
//   - done(err) : callback function
//       - err  : Any errors
threadSchema.methods.removePost = function(_post, done) {
  var thread = this;
  // Validate parameters
  if (!_post)
    return done('_post is required');
  if (!done || !_.isFunction(done))
    return done('done is require and must be a callable function');
  
  var index = thread.posts.indexOf(_post);
  if ( index === -1)
    return done('Post not found')

  Post.findOneAndRemove({_id: _post, _thread: this._id}, function(err, post) {
    if (err)
      return done(err);

    // Called to update user.numOfPosts
    if (post)
      post.remove();

    thread.posts.splice(index, 1);
    thread.replies = thread.posts.length;

    thread.save(function(err) {

      thread.updateLastPost();

      done(null);
    });
  });
};

// Update views
// @params
//   - viewer : id of the user
threadSchema.methods.updateViews = function(viewer) {
  // Add viewers
  this.viewers = _.union(this.viewers, [viewer]);
  // Remove duplicated
  this.viewers = _.unique(this.viewers, false, function(v) {return v.toString()});
  // Adjust views numbers
  this.views = this.viewers.length;
  // Save in database
  this.save();
};

// Update the lastPost field
threadSchema.methods.updateLastPost = function() {
  var thread = this;

  Post.findOne()
  .sort('-createDate')
  .exec( function(err, post) {

    if(!post)
      thread.lastPost = null;
    else
      thread.lastPost = post._id;

    thread.save();
  });
  return;
}

// Update tags
threadSchema.methods.updateTags = function(done) {
  if (!done || !_.isFunction(done))
    return done('done is require and must be a callable function');

  var thread = this;
  thread.tags = _.union(thread.subject.split(' '), thread.body.split(' '));
  async.map(thread.posts, function(post, callback) {
    Post.findOne({_id: post}, function(err, pst) {
      if(pst){
        thread.tags = _.union(thread.tags, pst.subject.split(' '), pst.subject.split(' '));
      }

      callback(null);
    });
  }, function(err) {
    thread.save();
    done(null);
  });
};

// Add deepPopulate plugin
threadSchema.plugin(deepPopulate, {
  populate: {
    'lastPost._creator': {
      select: "firstName lastName isFirstNamePublic isLastNamePublic nickname"
    }
  }
});

// Add schema to the database
var Thread = mongoose.model('Thread', threadSchema);

// Make the model available to the rest of the application
module.exports = Thread;
