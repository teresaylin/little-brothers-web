var mongoose = require('mongoose');
var bcrypt = require('bcrypt');

var utils = require('./utils');

var volunteerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
});

/* Create a new volunteer */
volunteerSchema.statics.addVolunteer = function(display_name, phone_num, cb) {
  var Volunteer = this;
  Volunteer.findOne({ 'name': display_name, 'phone': phone_num }, function(err, user) {
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
volunteerSchema.statics.removeVolunteer = function(display_name, cb) {
  Volunteer.remove({'name': display_name}, function(err, user) {
    if (user.result.n !== 0) {
      cb({ success: true, message: 'Volunteer has been successfully deleted' });
    } else {
      cb({ success: false, message: 'Volunteer does not exist' });
    }
  });
};


Volunteer = mongoose.model('Volunteer', volunteerSchema);

module.exports = Volunteer;
