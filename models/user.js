var mongoose = require('mongoose');
var bcrypt = require('bcrypt');

var utils = require('./utils');

var userSchema = new mongoose.Schema({
  username: { type: String, required: true, index: { unique: true } },
  password_hash: { type: String, required: true }
});

/*
 * Registration handler.
 * cb expects an object with 2 fields:
 *    success: whether the registration was successful
 *    message: string displayed to the user
 */
userSchema.statics.register = function(username, password, password_confirm, cb) {
  if (username.length == 0) {
    cb({ success: false, message: 'The username cannot be blank!' });
    return;
  }
  if (password.length < 8) {
    cb({ success: false,
         message: 'The password needs to be at least 8 characters long!' });
    return;
  }
  if (password !== password_confirm) {
    cb({ success: false, message: 'The passwords don\'t match!' });
    return;
  }

  var User = this;
  User.findOne({ 'username': username }, function(err, user) {
    if (user) {
      cb({ success: false, message: 'Username already exists!' });
    } else {
      bcrypt.hash(password, 10, function(err, hash) {
        var new_user = new User({
          username: username,
          password_hash: hash
        });
        new_user.save(function(err) {
          cb({ success: true, message: 'Registration successful!' });
        });
      });
    }
  });
};

/*
 * Login handler.
 * cb expects an object with 3 fields:
 *    success: whether the login was successful
 *    message: string shown to the user trying to login
 *    user: the user object, if success == true
 */
userSchema.statics.authenticate = function(username, password, cb) {
  this.findOne({ username: username }, function(err, user) {
    if (user === null) {
      cb({ success: false,
                 message: 'Username or password is not correct',
                 user: {} });
    } else {
      bcrypt.compare(password, user.password_hash, function(err, result) {
        if (result === false) {
          cb({ success: false,
                     message: 'Username or password is not correct',
                     user: {} });
        } else {
          cb({ success: true, message: '', user: user });
        }
      });
    }
  });
};

var User = mongoose.model('User', userSchema);

module.exports = User;
