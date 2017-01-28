var mongoose = require('mongoose');
var bcrypt = require('bcrypt');
var utils = require('./utils');
var db = mongoose.connection;

var adminSchema = new mongoose.Schema({
  name: { type: String, required: true, index: { unique: true } },
  phone: { type: String, required: true },
  hasAccount: { type: Boolean, required: true }
});

/*
Adds a new admin, if the admin does not already exist
*/
adminSchema.statics.addAdmin = function(display_name, phone_num, cb) {
  var Admin = this;
  Admin.findOne({ 'name': display_name }, function(err, user) {
    if (user) {
      cb({ success: false, message: 'Admin already exists' });
    } else {
      var new_admin = new Admin({
        name: display_name,
        phone: phone_num,
        hasAccount: false
      });
      new_admin.save(function(err) {
        if (err) {
          cb({ success: false, message: 'Incorrect / nonexisting name or phone number'});
        } else {
          cb({ success: true, message: 'Admin successfully added'});  
        }
      });
    }
  });
};

/*
Removes an admin, if the admin exists
*/
adminSchema.statics.removeAdmin = function(display_name, cb) {
  Admin.remove({'name': display_name}, function(err, user) {
    if (user.result.n !== 0) {
      cb({ success: true, message: 'Admin has been successfully deleted' });
    } else {
      cb({ success: false, message: 'Admin does not exist' });
    }
  });
};

var Admin = mongoose.model('Admin', adminSchema);

module.exports = Admin;
