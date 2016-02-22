/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */

/**
 * Section model
 *
 * @author 571555
 * @version 1.1
 * 
 * Changes in version 1.1
 * 1. Added last post functionality
 *
 **/
"use strict";

// Get required modules
var async        = require('async');
var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;
var ObjectId     = Schema.Types.ObjectId;
var _            = require('underscore');
var deepPopulate = require('mongoose-deep-populate')(mongoose);

// Get reference Models
var User   = require('../../models/User');
var Thread = require('./Thread');
var Post   = require('./Post');

// Model User database to use in references
User = mongoose.model('User', User);

// Create the Section schema
var sectionSchema = new Schema({
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
  threads: [{
    type: ObjectId,
    ref: 'Thread'
  }],
  numOfThreads: {
    type: Number,
    default: 0
  },
  lastPost: {
    type: ObjectId,
    ref: 'Thread'
  },
  subject: String
});

// Add thread
// @params
//   - _creator           : id of the User
//   - subject            : the subject of the post
//   - body               : the body of the post
//   - done(err, post) : callback function
//       - err  : Any errors
//       - post : the new post object
sectionSchema.methods.addThread = function(_creator, subject, body, done) {
  var section = this;
  // Validate parameters
  if (!_creator)
    return done('_creator is required');
  if (!subject)
    return done('subject is required');
  if (!body)
    return done('body is required');
  if (!done || !_.isFunction(done))
    return done('done is require and must be a callable function');

  var newThread = new Thread({
    _creator: _creator,
    subject:  subject,
    body:     body,
    _section: section._id,
  });

  newThread.viewers.push(_creator);
  newThread.views = newThread.viewers.length;


  newThread.save(function(err) {
    if (err) {
      return done(err);

      newThread.updateViews();
    }

    section.threads.push(newThread._id);

    section.numOfThreads = section.threads.length;

    section.save(function(err) {
      if (err)
        return done(err);

      section.updateLastPost();

      User.findOne({_id: _creator}, function(err, user) {
        if(err)
          return done(err);

        if(!user)
          return done("User not found");

        user.threads.push(newThread._id);

        user.save(function(err) {
          if (err)
            return done(err);

          user.updatePosts();

          return done(null, newThread);
        });
      });
    });
  });
};

// Remove thread
// @params
//   - _thread           : id of the thread
//   - done(err) : callback function
//       - err  : Any errors
sectionSchema.methods.removeThread = function(_thread, done) {
  var _creator = null;
  var section = this;
  // Validate parameters
  if (!_thread)
    return done('_thread is required');
  if (!done || !_.isFunction(done))
    return done('done is require and must be a callable function');
  
  var index = section.threads.indexOf(_thread);
  if ( index === -1)
    return done('Thread not found');

  // Find the thread we are deleting
  Thread.findOne({_id: _thread, _section: section._id}, function(err, thread) {

    if (!thread)
      return done("Thread not found");

    _creator = thread._creator;

    // Make sure to delete any posts before deleting thread
    async.map(thread.posts, function(post, callback) {
      thread.removePost(post, callback);
    }, function(err) {;

      // Once posts are deleted, delete threads
      Thread.remove({_id: _thread, _section: section._id}, function(err) {

        section.threads.splice(index, 1);
        section.numOfThreads = section.threads.length;

        section.save(function(err) {

          section.updateLastPost();

          User.findOne({_id: _creator}, function(err, user) {

            if(!user)
              return done("User not found");

            var index = user.threads.indexOf(_thread);
            if ( index === -1)
              return done('Thread not found');

            user.threads.splice(index,1);

            user.save(function(err) {

              user.updatePosts();
              
              return done(null);
            });
          });
        });
      });
    });

  });

};

// Update the lastPost field
sectionSchema.methods.updateLastPost = function() {
  var section = this;

  Thread.findOne({_section: section._id})
  .sort('-createDate')
  .exec( function(err, thread) {
    if(!thread)
      section.lastPost = null;
    else
      section.lastPost = thread._id;

    section.save();
  });
  return;
}

// Add deepPopulate plugin
sectionSchema.plugin(deepPopulate, {
  populate: {
    'lastPost._creator': {
      select: "firstName lastName isFirstNamePublic isLastNamePublic nickname"
    }
  }
});

// Add schema to the database
var Section = mongoose.model('Section', sectionSchema);

// Make the model available to the rest of the application
module.exports = Section;