var express = require('express');
var router = express.Router();

var User = require('../models/user');
// var Team = require('../models/team');

var authenticate = function(req, res, next) {
  if (req.session.currentUser) {
    next();
  } else {
    res.render('index', { message: 'Please log in!' });
  }
};

router.all('*', authenticate);

/* GET the user page */
router.get('/:user', function(req, res, next) {
  var user = req.session.currentUser;
  var user_confirm = req.params.user;

  if (user.username !== user_confirm) {
    res.render('index', { message: 'You are not this user!' });
    return;
  }

  User.findOne({ 'username': user.username }, function(err, user) {
    res.render('user', { user: user, message: '' });
  });
});

module.exports = router;
