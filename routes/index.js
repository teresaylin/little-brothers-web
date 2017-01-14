var express = require('express');
var bcrypt = require('bcrypt');
var router = express.Router();

var User = require('../models/user');

/* GET home page. */
router.get('/', function(req, res, next) {
  var user = req.session.currentUser;
  if (user) {
    res.render('home', { user: user, message: '' });
  } else {
    res.render('index', { message: '' });
  }
});

router.get('/register', function(req, res, next) {
  res.render('register', { message: '' });
});

router.get('/login', function(req, res, next) {
  res.render('login', { message: '' });
});

router.post('/register', function(req, res, next) {
  User.register(req.body.username,
                req.body.password,
                req.body.confirm_password,
                function(data) {
    if (data.success) {
      res.redirect('/login');
    } else {
      res.render('register', { message: data.message });
    }
  });
});

router.post('/login', function(req, res, next) {
  var username = req.body.username;
  var password = req.body.password;

  User.authenticate(username, password, function(data) {
    if (data.success) {
      req.session.currentUser = data.user;
      res.redirect('/home');
    } else {
      res.render('login', { message: data.message });
    }
  });
});

router.get('/logout', function(req, res, next) {
  req.session.currentUser = undefined;
  res.redirect('/');
});

module.exports = router;
