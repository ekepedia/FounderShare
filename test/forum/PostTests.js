/*
 * Copyright (c) 2015 TopCoder, Inc. All rights reserved.
 */
/**
 * Test units for Section Controller
 * @version 1.0
 * @author 571555
 */
'use strict';

var helper = require('../testHelper');
var assert = require('assert');
var request = require('supertest');
var winston = require('winston');
var level = winston.level;

// Set winston to only errors
winston.level = "error";

var ADMIN = {
  email: "superuser@domain.com",
  password: "password",
  id: "5608307417f73e7c266a27b2",
  session: '',
  auth: ''
};
var USER1 = {
  email: "user1@domain.com",
  password: "password",
  id: "5608307417f73e7c266a279f",
  session: '',
  auth: ''
};
var USER2 = {
  email: "user2@b536.com",
  password: "password",
  id: "5608307517f73e7c266a3442",
  session: '',
  auth: ''
};

var section, thread, post;

// Start the app
var app = require('../../src/app.js');

describe("PostControllerTests", function() {

  /**
   * Reset test data
   * @param {Function} done the callback
   */
  function resetData(done) {
    this.timeout(10000);
    helper.resetData(function (err, result) {
      if (err) {
        done(err);
      } else {
        done();
      }
    });
  }

  before(resetData);

  describe("#login", function() {

    it('should login USER1', function(done) {
      request(app)
        .post('/login?type=PASSWORD')
        .send({
          "email":USER1.email,
          "password": USER1.password
        })
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          USER1.session = res.body.sessionToken;
          USER1.auth = "Bearer " + USER1.session;
          done();
        });
    });

    it('should login USER2', function(done) {
      request(app)
        .post('/login?type=PASSWORD')
        .send({
          "email":USER2.email,
          "password": USER2.password
        })
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          USER2.session = res.body.sessionToken;
          USER2.auth = "Bearer " + USER2.session;
          done();
        });
    });

    it('should login ADMIN', function(done) {
      request(app)
        .post('/login?type=PASSWORD')
        .send({
          "email": ADMIN.email,
          "password": ADMIN.password
        })
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          ADMIN.session = res.body.sessionToken;
          ADMIN.auth = "Bearer " + ADMIN.session;
          done();
        });
    });
  });

  describe("#makeSection", function() {

    it("Should make new section", function(done) {
      request(app)
        .post('/forum/sections')
        .send({
          "subject": "New Section 1"
        })
        .set({
          "Authorization": ADMIN.auth
        })
        .expect(201)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          section = res.body.data._id;
          done();
        })
    });

  });

  describe("#makeThread", function() {      

    it("Should return 201 for creating new thread", function(done) {
      request(app)
        .post('/forum/sections/' + section + '/threads')
        .send({
          "subject": "New Thread 1",
          "body": "body"
        })
        .set({
          "Authorization": USER1.auth
        })
        .expect(201)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          thread = res.body.data._id;
          console.log(res.body.data);
          console.log(thread);
          done();
        })
    });

  });

  describe("#makePost", function() {

    it("Should return 401 for not being logged in", function(done) {
      request(app)
        .post('/forum/sections/' + section + '/threads/' + thread + '/posts')
        .send({
          "subject": "New Post 1"
        })
        .expect(401)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          done();
        })
    });

    it("Should return 500 for not providing body", function(done) {
      request(app)
        .post('/forum/sections/' + section + '/threads/' + thread + '/posts')
        .send({
          "subject": "New Post 1"
        })
        .set({
          "Authorization": USER1.auth
        })
        .expect(500)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          done();
        })
    });

    it("Should return 201 for creating new post", function(done) {
      request(app)
        .post('/forum/sections/' + section + '/threads/' + thread + '/posts')
        .send({
          "subject": "New Post 1",
          "body": "body"
        })
        .set({
          "Authorization": USER1.auth
        })
        .expect(201)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          post = res.body.data._id;
          done();
        })
    });

  });

  describe("#getAllPosts", function() {

    it("Should return 404 for no posts found", function(done) {
      request(app)
        .get('/forum/sections/' + section + '/threads/' + thread + '/posts/?offset=1000000')
        .expect(404)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          done();
        })
    });

    it("Should return 200 for found posts", function(done) {
      request(app)
        .get('/forum/sections/' + section + '/threads/' + thread + '/posts/')
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          done();
        })
    });

  });

  describe("#updateOnePost", function() {

    it("Should return 401 for not being logged in", function(done) {
      request(app)
        .put('/forum/sections/' + section + '/threads/' + thread + '/posts/' + post)
        .send({
          "subject": "Updated Post 1"
        })
        .expect(401)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          done();
        })
    });

    it("Should return 403 for not being owner of post", function(done) {
      request(app)
        .put('/forum/sections/' + section + '/threads/' + thread + '/posts/' + post)
        .send({
          "subject": "Updated Post 1"
        })
        .set({
          "Authorization": USER2.auth
        })
        .expect(403)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          done();
        })
    });

    it("Should return 404 for non existing post", function(done) {
      request(app)
        .put('/forum/sections/' + section + '/threads/' + thread + '/posts/123451234512345123451234')
        .send({
          "subject": "Updated post 1"
        })
        .set({
          "Authorization": USER1.auth
        })
        .expect(404)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          done();
        })
    });

    it("Should return 200 for post update as owner", function(done) {
      request(app)
        .put('/forum/sections/' + section + '/threads/' + thread + '/posts/' + post)
        .send({
          "subject": "Updated Post 1"
        })
        .set({
          "Authorization": USER1.auth
        })
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          done();
        })
    });

    it("Should return 200 for post update as admin", function(done) {
      request(app)
        .put('/forum/sections/' + section + '/threads/' + thread + '/posts/' + post)
        .send({
          "subject": "Updated Post 1"
        })
        .set({
          "Authorization": ADMIN.auth
        })
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          done();
        })
    });

  });

  describe("#deleteOnePost", function() {

    it("Should return 401 for not being logged in", function(done) {
      request(app)
        .delete('/forum/sections/' + section + '/threads/' + thread + '/posts/' + post)
        .expect(401)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          done();
        })
    });

    it("Should return 403 for not being owner of post", function(done) {
      request(app)
        .delete('/forum/sections/' + section + '/threads/' + thread + '/posts/' + post)
        .set({
          "Authorization": USER2.auth
        })
        .expect(403)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          done();
        })
    });

    it("Should return 404 for non existing post", function(done) {
      request(app)
        .delete('/forum/sections/' + section + '/threads/' + thread + '/posts/123451234512345123451234')
        .set({
          "Authorization": USER1.auth
        })
        .expect(404)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          done();
        })
    });

    it("Should return 200 for post update as owner", function(done) {
      request(app)
        .delete('/forum/sections/' + section + '/threads/' + thread + '/posts/' + post)
        .set({
          "Authorization": USER1.auth
        })
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          done();
        })
    });

  });

  after(function() {
    winston.level = level;
  });
  
});
