/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */
/**
 * Section Controller
 * @version 1.1
 * @author 571555
 *
 * Changes in version 1.1
 * 1. Added last post functionality
 * 
 */
"use strict";

// Get required modules
var async   = require('async');
var _       = require('underscore');

// Get required Models
var Section = require('../models/Section');
var Thread  = require('../models/Thread');

// Get required controllers
var ValidationController = require('./ValidationController');

// Set common methods
var toObjectId = ValidationController.toObjectId;

// Initiate blank controller
var controller = {};

// GET all sections
// @returns
//   - [sections] : An array of section documents
controller.getAllSections = function(req, res, next) {
  Section.find({})
  .limit(req.limit)
  .skip(req.offset)
  .populate({
    path: 'lastPost',
    select: "createDate updateDate subject body"
  })
  .deepPopulate('lastPost._creator')
  .exec(function(err, sections) {

    if (err) {
      return res.status(500).json({
        success: false,
        message: err
      });
    }

    if (_.isEmpty(sections)) {
      return res.status(404).json({
        success: false,
        message: "No sections found"
      });
    }
    return res.status(200).json({
      success: true,
      message: "Retrieved all sections",
      limit: req.limit,
      offset: req.offset,
      numberFound: sections.length,
      data: sections
    });
  });
};

// GET a specific sections
// @params
//   - sId : Id of the section
// @returns
//   - {section} : Section document
controller.getOneSection = function(req, res, next) {
  // Convert to objectId
  var sId = toObjectId(req.params.sId);

  // Make sure id was valid
  if (!sId) {
    return res.status(400).json({
      success: false,
      message: "Invalid Object Id"
    });
  }

  Section.findOne({_id: sId})
  .populate({
    path: 'lastPost',
    select: "createDate updateDate subject body"
  })
  .deepPopulate('lastPost._creator')
  .exec( function(err, section) {
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
    // Get threads of section
    Thread.find({_section: sId}, function(err, threads) {
      if (err) {
        return res.status(500).json({
          success: false,
          message: err
        });
      }

      if (_.isEmpty(threads)) {
        return res.status(200).json({
          success: true,
          message: "Section found",
          data: section
        });
      } else {
        section = section.toObject();
        section.threads = threads;
      }
      return res.status(200).json({
        success: true,
        message: "Section found",
        data: section
      });
    });
  });
};

// POST a new section
// @params
//   - subject : Subject of the new section
//   - body    : Body of the new section
controller.addNewSection = function(req, res, next) {
  var newSection = new Section({
    _creator: req.user.id,
    subject: req.body.subject
  });

  newSection.save(function(err) {
    if (err) {
      return res.status(500).json({
        success: false,
        message: err
      });
    }
    res.status(201).json({
      success: true,
      message: "New section created",
      data: newSection
    });
  }
  );
};

// PUT a specific sections
// @params
//   - sId     : Id of the section
//   - subject : The updated subject
// @returns
//   - {section} : Updated section document
controller.updateOneSection = function(req, res, next) {
  // Convert to objectId
  var sId = toObjectId(req.params.sId);

  // Make sure id was valid
  if (!sId) {
    return res.status(400).json({
      success: false,
      message: "Invalid Object Id"
    });
  }

  var updates = _.pick(req.body, 'subject');
  updates._updater = req.user.id;
  updates.updateDate = Date.now();

  Section.findOneAndUpdate({_id: sId}, {$set: updates}, {}, function(err, section) {
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

    return res.status(200).json({
      success: true,
      message: "Section updated",
      data: section
    });
  });
};

// DELETE a specific sections
// @params
//   - sId     : Id of the section
controller.deleteOneSection = function(req, res, next) {
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
    // Remove every thread, which will remove every post
    async.map(section.threads, function(thread, done) {
      section.removeThread(thread, function(err) {
        if (err) {
          return done(err);
        }

        done();
      });
    }, function(err) {
      if (err) {
        return res.status(500).json({
          success: false,
          message: err
        });
      }

      section.remove(function(err) {
        if (err) {
          return res.status(500).json({
            success: false,
            message: err
          });
        }

        return res.status(200).json({
          success: true,
          message: "Section deleted"
        });
      });
    });
  });
};

module.exports = controller;