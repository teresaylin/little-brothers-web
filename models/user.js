var mongoose = require('mongoose');
var bcrypt = require('bcrypt');
var utils = require('./utils');
var Admin = require('../models/admin')

var userSchema = new mongoose.Schema({
  username: { type: String, required: true, index: { unique: true } },
  password_hash: { type: String, required: true },
  admin: { type: String, required: true, ref: 'adminSchema'}
});

/*
 * Registration handler. Authenticates that a new user is also an admin in CiviCRM.
 * cb expects an object with 2 fields:
 *    success: whether the registration was successful
 *    message: string displayed to the user
 */
userSchema.statics.register = function(fullname, username, password, password_confirm, cb) {
  var User = this;
  Admin.findOne({ 'name': fullname }, function(err, user) {
    if (user && !user.hasAccount) {
      // admin exists and does not have a user account
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

      User.findOne({ 'username': username }, function(err, user2) {
        if (user2) {
          cb({ success: false, message: 'Username already exists!' });
        } else {
          user.hasAccount = true;
          user.save();

          bcrypt.hash(password, 10, function(err, hash) {
            var new_user = new User({
              username: username,
              password_hash: hash,
              admin: user.name
            });
            new_user.save(function(err) {
              cb({ success: true, message: 'Registration successful!' });
            });
          });
        }
      });

    } else if (user && user.hasAccount) {
      cb({ success: false, message: 'This admin has already created a user account'});
    } else {
      cb({ success: false, message: 'This admin does not exist'});
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
  this.findOne({ 'username': username }, function(err, user) {
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

/*
 * Change password.
 * cb expects an object with 3 fields:
 *    success: whether the login was successful
 *    message: string shown to the user trying to login
 *    user: the user object, if success == true
 */
userSchema.statics.changePassword = function(username, old, new1, new2, cb) {
  var User = this;
  User.findOne({ 'username': username }, function(err, user) {
    if (user) {
      bcrypt.compare(old, user.password_hash, function(err, result) {
        if (result === false) {
          cb({ success: false,
            message: 'Current password is not correct',
            user: user });
        } else {
          if (new1 === new2 && new1.length >= 8) {
            bcrypt.hash(new1, 10, function(err, hash) {
              User.update({ 'username': username },
                { $set: { 'password_hash': hash } },
                function(err, result) {
                  cb({ success: true, message: 'Password successfully updated! Please login again.', user: user });
              });
            });
          } else if (new1 === new2 && new1.length < 8) {
            console.log('match, but short');
            cb({ success: false,
              message: 'New password needs to be at least 8 characters long!',
              user: user });
          } else {
            console.log('no match');
            cb({ success: false,
              message: 'New passwords do not match',
              user: user });
          }
        }
      });
    } else {
      cb({ success: false, message: 'This user does not exist'});
    }
  });
};


var User = mongoose.model('User', userSchema);

module.exports = User;
