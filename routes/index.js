var express = require('express');
var bcrypt = require('bcrypt');
var router = express.Router();

var User = require('../models/user');
var Admin = require('../models/admin')

var secrets = require('dotenv').config();

var config = {
  server: process.env.LB_URL,
  path: '/sites/all/modules/civicrm/extern/rest.php',
  key: process.env.LB_KEY,
  api_key: process.env.LB_API_KEY
};
var crmAPI = require('civicrm')(config);

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

router.post('/register', function(req, res, next) {
  User.register(req.body.full_name,
                req.body.username,
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

router.get('/login', function(req, res, next) {
  res.render('login', { message: '' });
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

/* Incorporating civi API through node package civicrm */

// GET new emergency requests: Name, Location, Phone Number, Details
crmAPI.get('Activity', {activity_type_id:'Emergency Food Package', status_id:'Scheduled', options:{limit:3}, return:'custom_102,location,phone_number,details'},
  function (result) {
    for (var i in result.values) {
      val = result.values[i];
      console.log(val.id + ": " + val.custom_102 + " " + val.location + " " + val.phone_number + " " + val.details);
    }
  }
);

// GET volunteers tagged with 'Emergency Food Package Volunteer': Name, Phone Number
// tag ID of 'Emergency Food Package Volunteer' is 190
// should return Teresa, Kristy, Stuti, Shana
crmAPI.get('contact', {tag:'190', return:'display_name,phone'},
  function (result) {
    for (var i in result.values) {
      val = result.values[i];
      console.log(val.id + ": " + val.display_name + " " + val.phone);
    }
  }
);

// GET Admins tagged with 'admin'
// tag ID of 'admin' is 191
// should return Teresa, Kristy, Stuti, Shana, Cynthia
crmAPI.get('contact', {tag:'191', options:{limit:50}, return:'display_name,phone'},
  function (result) {    
    for (var i in result.values) {
      val = result.values[i];
      console.log(val.id + ": " + val.display_name + " " + val.phone);

      Admin.addAdmin(val.display_name, val.phone, function(data) {
        console.log(data.message)
      });
    }
  }
);


module.exports = router;
