var mongoose = require('mongoose');
var bcrypt = require('bcrypt');

var utils = require('./utils');

var volunteerSchema = new mongoose.Schema({
  name: { type: String, required: true, index: { unique: true } },
  phone: { type: String, required: true },
});

/* Create a new volunteer */
volunteerSchema.statics.addVolunteer = function(display_name, phone_num, cb) {
  var Volunteer = this;
  Volunteer.findOne({ 'name': display_name }, function(err, user) {
    if (user) {
      cb({ success: false, message: 'Volunteer already exists' });
    } else {
      var new_vol = new Volunteer({
        name: display_name,
        phone: phone_num
      });
      new_vol.save(function(err) {
        if (err) {
          cb({ success: false, message: 'Incorrect / nonexisting name or phone number'});
        } else {
          cb({ success: true, message: 'Volunteer successfully added'});
        }
      });
    }
  });
};

/* Remove a volunteer */


Volunteer = mongoose.model('Volunteer', volunteerSchema);

module.exports = Volunteer;
