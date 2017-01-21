var mongoose = require('mongoose');
var bcrypt = require('bcrypt');
var utils = require('./utils');

/*
Authenticate that new registration matches someone who is an admin in Civi
*/
var adminSchema = new mongoose.Schema({
  name: { type: String, required: true, index: { unique: true } },
  phone: { type: String, required: true },
  hasAccount: { type: Boolean, required: true }
});

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

var Admin = mongoose.model('Admin', adminSchema);

module.exports = Admin;
