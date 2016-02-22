/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */
/**
 * Validation Controller
 * @version 1.0
 * @author 571555
 */
"use strict";

// Get required modules
var _       = require('underscore');
var Const   = require('../../Const');

// Get required Models
var Thread  = require('../models/Thread');
var Post    = require('../models/Post');

// Initiate blank controller
var controller = {};

// Checks to make sure that an id is valid
// If it is valid, then it converts it.
// Otherwise, it will return null
// @params
//   - id : id to be tested
// @returns
//   - obejctId : objectId version of id, or null
controller.toObjectId = function(id) {
  var ObjectId = require('mongoose').Types.ObjectId;
  var objectId = null;
  // Only sets the objectId if the id is valid
  if (ObjectId.isValid(id)) {
    objectId = ObjectId(id);
  }
  
  return objectId;
};

// Check to make sure that the user is logged in
// Logic:
//   1. Check to make sure that req.user is not null
controller.isLoggedIn = function (req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "You must be logged in to perform this action"
    });
  } else {
    return next();
  }
};

// Check to make sure that user is authorized
// Logic:
//   1. Check to see if user is an admin
controller.isAdmin = function (req, res, next) {
  // Get roles of the user
  var roles = _.pluck(req.user.userRoles, 'role');
  var isAdmin = _.contains(roles, Const.UserRole.PLATFORM_EMPLOYEE);
  
  if (isAdmin) {
    next();
  } else {
  	res.status(403).json({
	    success: false,
	    message: "You must be an admin to add or delete a section"
	  });
  }
};

// Check to make sure that user owns thread
// Logic:
//   1. Check to see if user is an admin. If so, bypass.
//   2. Check to see if user owns thread
controller.isThreadOwner = function (req, res, next) {
	// Get roles of the user
  var roles = _.pluck(req.user.userRoles, 'role');
  var isAdmin = _.contains(roles, Const.UserRole.PLATFORM_EMPLOYEE);
  
  if (isAdmin) {
    next();
  } else {
  	// Covert to objectId
    var tId = controller.toObjectId(req.params.tId);
    var sId = controller.toObjectId(req.params.sId);

    // Make sure ids were valid
    if (!tId || !sId) {
      return res.status(400).json({
        success: false,
        message: "Invalid Object Id"
      });
    }

    Thread.findOne({_id: tId, _section: sId}).populate({
      path: '_creator',
      select: 'id'
    })
    .exec(function(err, thread) {
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
      if (thread._creator.id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "You must be the owner or admin to edit or delete this thread"
        });
      } else {
        return next();
      }
    });
  }
};

// Check to make sure that user owns post
// Logic:
//   1. Check to see if user is an admin. If so, bypass.
//   2. Check to see if user owns post
controller.isPostOwner = function (req, res, next) {
	// Get roles of the user
  var roles = _.pluck(req.user.userRoles, 'role');
  var isAdmin = _.contains(roles, Const.UserRole.PLATFORM_EMPLOYEE);
  
  if (isAdmin) {
    next();
  } else {
  	// Covert to objectId
    var tId = controller.toObjectId(req.params.tId);
    var pId = controller.toObjectId(req.params.pId);
    var sId = controller.toObjectId(req.params.sId);

    // Make sure id was valid
    if (!tId || !pId || !sId) {
      return res.status(400).json({
        success: false,
        message: "Invalid Object Id"
      });
    }

    Post.findOne({_id: pId, _thread: tId})
    .populate({
      path: '_creator',
      select: 'id'
    })
    .exec(function(err, post) {

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
      if (post._creator.id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "You must be the owner or admin to edit or delete this post"
        });
      } else {
        return next();
      }
    });
  }
};
module.exports = controller;