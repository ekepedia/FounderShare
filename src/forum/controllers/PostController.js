/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */
/**
 * Thread Controller
 * @version 1.0
 * @author 571555
 */
"use strict";

// Get required modules
var _       = require('underscore');

// Get required Models
var Thread  = require('../models/Thread');
var Post    = require('../models/Post');

// Get required controllers
var ValidationController = require('./ValidationController');

// Set common methods
var toObjectId = ValidationController.toObjectId;

// Initiate blank controller
var controller = {};


// GET all posts of a specific thread
// @params
//   - sId : Id of the section
//   - tId : Id of the thread
// @returns
//   - [posts] : An array of post documents
controller.getAllPosts = function(req, res, next) {
  // Convert to objectId
  var tId = toObjectId(req.params.tId);

  // Make sure id was valid
  if (!tId) {
    return res.status(400).json({
      success: false,
      message: "Invalid Object Id"
    });
  }

  // Finds post and validates that it part of the correct post
  Post.find({_thread: tId})
  .populate({
    path: '_creator',
    select: 'firstName lastName isFirstNamePublic isLastNamePublic nickname'
  })
  .limit(req.limit)
  .skip(req.offset)
  .exec(function(err, posts) {
    if (err) {
      return res.status(500).json({
        success: false,
        message: err
      });
    }

    if (_.isEmpty(posts)) {
      return res.status(404).json({
        success: false,
        message: "Thread does not have any posts"
      });
    }

    res.status(200).json({
      success: true,
      message: "Posts found",
      limit: req.limit,
      offset: req.offset,
      numberFound: posts.length,
      data: posts
    });
  });
};

// POST a new post to a specific thread
// @params
//   - sId     : Id of the section
//   - tId     : Id of the thread
//   - subject : Subject of the new post
//   - body    : Body of the new post
// @returns
//   - {post} : A new post document
controller.addNewPost = function(req, res, next) {
  // Convert to objectId
  var sId = toObjectId(req.params.sId);
  var tId = toObjectId(req.params.tId);

  // Make sure ids were valid
  if (!sId || !tId) {
    return res.status(400).json({
      success: false,
      message: "Invalid Object Id"
    });
  }

  Thread.findOne({_id: tId, _section: sId}, function(err, thread) {
    if (err) {
      return res.status(500).jsonjson({
        success: false,
        message: err
      });
    }

    if (!thread) {
      return res.status(404).json({
        success: false,
        message: "Thread not found"
      });
    }

    thread.addPost(
      req.user.id,
      req.body.subject,
      req.body.body,
      function(err, post) {
        if (err) {
          return res.status(500).json({
            success: false,
            message: err
          });
        }

        thread.updateTags( function(err) {
          if (err) {
            return res.status(500).json({
              success: false,
              message: err
            });
          }

          return res.status(201).json({
            success: true,
            message: "Post added",
            data: post
          });  
        });
      }
    );
  });
};

// PUT a specific post
// @params
//   - sId     : Id of the section
//   - tId     : Id of the thread
//   - pId     : Id of the post
//   - subject : Subject of the post
//   - body    : Body of the new post
// @returns
//   - {post} : An updated post document
controller.updateOnePost = function(req, res, next) {
  // Convert to objectId
  var pId = toObjectId(req.params.pId);
  var tId = toObjectId(req.params.tId);

  // Make sure ids were valid
  if (!pId || !tId) {
    return res.status(400).json({
      success: false,
      message: "Invalid Object Id"
    });
  }
  
  var updates = _.pick(req.body, 'subject', 'body');

  // Add _updater and updateDate
  _.extend(updates, {_updater: req.user.id}, {updateDate: Date.now()});

  // Finds post and validates that it part of the correct post
  Post.findOneAndUpdate({_id: pId, _thread: tId}, updates, null, function(err, post) {
    if (err) {
      return res.status(500).json({
        success: false,
        message: err
      });
    }

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found"
      });
    }

    Thread.findOne({_id: tId}, function(err, thread) {
      if (err) {
        return res.status(500).json({
          success: false,
          message: err
        });
      }

      if (!thread) {
        return res.status(404).json({
          success: false,
          message: "Thread not found"
        });
      }

      thread.updateTags( function(err) {
        if (err) {
          return res.status(500).json({
            success: false,
            message: err
          });
        }

        return res.status(200).json({
          success: true,
          message: "Post updated",
          data: post
        });
      });
    });
  });
};

// DELETE a specific post
// @params
//   - sId : Id of the section
//   - tId : Id of the thread
//   - pId : Id of the post
controller.deleteOnePost = function(req, res, next) {
  // Convert to objectId
  var pId = toObjectId(req.params.pId);
  var sId = toObjectId(req.params.sId);
  var tId = toObjectId(req.params.tId);

  // Make sure ids were valid
  if (!pId || !tId || !sId) {
    return res.status(400).json({
      success: false,
      message: "Invalid Object Id"
    });
  }

  Thread.findOne({_id: tId, _section: sId}, function(err, thread) {
    if (err) {
      return res.status(500).json({
        success: false,
        message: err
      });
    }

    if (!thread) {
      return res.status(404).json({
        success: false,
        message: "Thread not found"
      });
    }

    thread.removePost(pId, function(err) {
      if (err) {
        res.status(500).json({
          success: false,
          message: err
        });
      }

      thread.updateTags( function(err) {
        if (err) {
          return res.status(500).json({
            success: false,
            message: err
          });
        }

        return res.json({
          success: true,
          message: "Post deleted"
        });
      });
    });
  });
};

module.exports = controller;