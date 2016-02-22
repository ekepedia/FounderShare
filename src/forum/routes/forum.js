/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */
/**
 * Forum routes
 * @version 1.0
 * @author 571555
 */
"use strict";

// Get required modules
var express = require('express');
var router  = express.Router();

// Get required controllers
var PostController       = require('../controllers/PostController');
var ThreadController     = require('../controllers/ThreadController');
var SectionController    = require('../controllers/SectionController');
var ValidationController = require('../controllers/ValidationController');

// Set Validation middleware
var isAdmin       = ValidationController.isAdmin;
var isLoggedIn    = ValidationController.isLoggedIn;
var isThreadOwner = ValidationController.isThreadOwner;
var isPostOwner   = ValidationController.isPostOwner;

// GET all sections
// @returns
//   - [sections] : An array of section documents
router.get('/sections',
  SectionController.getAllSections
);


// POST a new section
// @params
//   - subject : Subject of the new section
//   - body    : Body of the new section
router.post('/sections',
  isLoggedIn,
  isAdmin,
  SectionController.addNewSection
);

// GET a specific sections
// @params
//   - sId : Id of the section
// @returns
//   - {section} : Section document
router.get('/sections/:sId',
  SectionController.getOneSection
);

// PUT a specific sections
// @params
//   - sId     : Id of the section
//   - subject : The updated subject
// @returns
//   - {section} : Updated section document
router.put('/sections/:sId',
  isLoggedIn,
  isAdmin,
  SectionController.updateOneSection
);

// DELETE a specific sections
// @params
//   - sId     : Id of the section
router.delete('/sections/:sId',
  isLoggedIn,
  isAdmin,
  SectionController.deleteOneSection
);

// GET all threads for a specific section
// @params
//   - sId : Id of the section
// @returns
//   - [threads] : An array of thread documents
router.get('/sections/:sId/threads',
  ThreadController.getAllThreads
);

// POST a new thread to a specific thread
// @params
//   - sId     : Id of the section
//   - subject : Subject of the new thread
//   - body    : Body of the new thread
// @returns
//   - {thread} : A new thread object
router.post('/sections/:sId/threads',
  isLoggedIn,
  ThreadController.addNewThread
);

// GET a specific thread
// @params
//   - sId : Id of the section
//   - tId : Id of the thread
// @returns
//   - {thread} : A thread document
router.get('/sections/:sId/threads/:tId',
  ThreadController.getOneThread
);

// PUT a specific thread
// @params
//   - sId     : Id of the section
//   - tId     : Id of the thread
//   - subject : Subject of the thread
//   - body    : Body of the thread
// @returns
//   - {thread} : An updated thread document
router.put('/sections/:sId/threads/:tId',
  isLoggedIn,
  isThreadOwner,
  ThreadController.updateOneThread
);

// DELETE a specific thread
// @params
//   - sId : Id of the section
//   - tId : Id of the thread
router.delete('/sections/:sId/threads/:tId',
  isLoggedIn,
  isThreadOwner,
  ThreadController.deleteOneThread
);

// POST a new post to a specific thread
// @params
//   - sId     : Id of the section
//   - tId     : Id of the thread
//   - subject : Subject of the new post
//   - body    : Body of the new post
// @returns
//   - {post} : A new post document
router.post('/sections/:sId/threads/:tId/posts',
  isLoggedIn,
  PostController.addNewPost
);

// PUT a specific post
// @params
//   - sId     : Id of the section
//   - tId     : Id of the thread
//   - pId     : Id of the post
//   - subject : Subject of the post
//   - body    : Body of the new post
// @returns
//   - {post} : An updated post document
router.put('/sections/:sId/threads/:tId/posts/:pId',
  isLoggedIn,
  isPostOwner,
  PostController.updateOnePost
);

// GET all posts of a specific thread
// @params
//   - sId : Id of the section
//   - tId : Id of the thread
// @returns
//   - [posts] : An array of post documents
router.get('/sections/:sId/threads/:tId/posts',
  PostController.getAllPosts
);

// DELETE a specific post
// @params
//   - sId : Id of the section
//   - tId : Id of the thread
//   - pId : Id of the post
router.delete('/sections/:sId/threads/:tId/posts/:pId',
  isLoggedIn,
  isPostOwner,
  PostController.deleteOnePost
);

module.exports = router;