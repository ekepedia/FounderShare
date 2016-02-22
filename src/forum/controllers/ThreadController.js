/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */
/**
 * Thread Controller
 * @version 1.1
 * @author 571555
 * 
 * Changes in version 1.1
 * 1. Added last post functionality
 *
 */
"use strict";

// Get required modules
var _       = require('underscore');
var async   = require('async');

// Get required Models
var Section = require('../models/Section');
var Thread  = require('../models/Thread');

// Get required controllers
var ValidationController = require('./ValidationController');

// Set common methods
var toObjectId = ValidationController.toObjectId;

// Initiate blank controller
var controller = {};

// GET all threads for a specific section
// @params
//   - sId : Id of the section
// @returns
//   - [threads] : An array of thread documents
controller.getAllThreads = function(req, res, next) {
  // Convert to objectId
  var sId = toObjectId(req.params.sId);

  // Make sure id was valid
  if (!sId) {
    return res.status(400).json({
      success: false,
      message: "Invalid Object Id"
    });
  }

  Thread.find({_section: sId})
  .limit(req.limit)
  .skip(req.offset)
  .populate({
    path: 'lastPost',
    select: "createDate updateDate subject body"
  })
  .populate('posts')
  .deepPopulate('lastPost._creator')
  .exec(function(err, threads) {
    if (err) {
      return res.status(500).json({
        success: false,
        message: err
      });
    }

    if (_.isEmpty(threads)) {
      return res.status(404).json({
        success: false,
        message: "Section does not have any threads"
      });
    }

    if (req.search) {
      async.map(threads, function(thread, callback) {
        var match = _.isEmpty(_.intersection(lower(thread.tags), lower(req.search)));
        if (!match) {
          callback(null, thread);
        } else {
          callback(null, null);
        }
      }, function(err, thrds) {
        thrds = _.without(thrds, null);
        return res.status(200).json({
          success: true,
          limit: req.limit,
          offset: req.offset,
          search: req.search,
          numberFound: thrds.length,
          message: "Retrieved all threads",
          data: thrds
        });
      });
    } else {
      return res.status(200).json({
        success: true,
        limit: req.limit,
        offset: req.offset,
        numberFound: threads.length,
        message: "Retrieved all threads",
        data: threads
      });
    }
  });
};

// POST a new thread to a specific thread
// @params
//   - sId     : Id of the section
//   - subject : Subject of the new thread
//   - body    : Body of the new thread
// @returns
//   - {thread} : A new thread object
controller.addNewThread = function(req, res, next) {
  // Convert to objectId
  var sId = toObjectId(req.params.sId);

  // Make sure id was valid
  if (!sId) {
    return res.status(400).json({
      success: false,
      message: "Invalid Object Id"
    });
  }

  Section.findOne({_id: sId}, function(err, section) {
    if (err) {
      return res.status(500).json({
        success: false,
        message: err
      });
    }

    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not found"
      });
    }

    section.addThread(
      req.user.id,
      req.body.subject,
      req.body.body,
      function(err, thread) {
        if (err) {
          return res.status(500).json({
            success: false,
            message: err
          });
        }
        
        thread.updateTags( function(err) {
          if (err){
            return res.status(500).json({
              success: false,
              message: err
            });
          }

          return res.status(201).json({
            success: true,
            message: "New thread created",
            data: thread
          });
        });
      }
    );
  });
};

// GET a specific thread
// @params
//   - sId : Id of the section
//   - tId : Id of the thread
// @returns
//   - {thread} : A thread document
controller.getOneThread = function(req, res, next) {
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

  Thread.findOne({_id: tId, _section: sId})
  .populate({
    path: '_creator',
    select: "firstName lastName isFirstNamePublic isLastNamePublic nickname"
  })
  .populate({
    path: 'posts',
    select: "_creator createDate updateDate subject body"
  })
  .populate({
    path: 'lastPost',
    select: "createDate updateDate subject body"
  })
  .populate({
    path: 'lastPost._creator',
    select: "firstName lastName isFirstNamePublic isLastNamePublic nickname",
    model: 'Post'
  })
  .deepPopulate('lastPost._creator')
  .exec( function(err, thread) {

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

    if (req.user)
      thread.updateViews(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Thread found",
      data: thread
    });
  });
};

// PUT a specific thread
// @params
//   - sId     : Id of the section
//   - tId     : Id of the thread
//   - subject : Subject of the thread
//   - body    : Body of the thread
// @returns
//   - {thread} : An updated thread document
controller.updateOneThread = function(req, res, next) {
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

  // Make sure we are only updating the subject and body
  var updates = _.pick(req.body, 'subject', 'body');

  // Add _updater and updateDate
  _.extend(updates, {_updater: req.user.id}, {updateDate: Date.now()});

  Thread.findOneAndUpdate({_id: tId, _section: sId}, {$set: updates}, {}, function(err, thread) {
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

    thread.updateTags( function(err) {
      if (err){
        return res.status(500).jsonjson({
          success: false,
          message: err
        });
      }

      return res.status(200).json({
        success: true,
        message: "Thread updated",
        data: thread
      });
    });
  });
};

// DELETE a specific thread
// @params
//   - sId : Id of the section
//   - tId : Id of the thread
controller.deleteOneThread = function(req, res, next) {
  // Convert to objectId
  var sId = toObjectId(req.params.sId);
  var tId = toObjectId(req.params.tId);

  // Make sure ids were valid
  if (!tId || !sId) {
    return res.status(400).json({
      success: false,
      message: "Invalid Object Id"
    });
  }

  Section.findOne({_id: sId}, function(err, section) {
    if (err) {
      return res.status(500).json({
        success: false,
        message: err
      });
    }

    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not found"
      });
    }

    section.removeThread(tId, function(err) {
      if (err) {
        return res.status(500).json({
          success: false,
          message: err
        });
      }

      res.json({
        success: true,
        message: "Thread deleted"
      });
    });
  });
};

module.exports = controller;

function lower(arr) {
  var a = [];
  for (var i = 0; i < arr.length; i++) {
    a.push(arr[i].toLowerCase());
  }
  return a;
}
