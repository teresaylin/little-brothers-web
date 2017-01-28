var mongoose = require('mongoose');
var bcrypt = require('bcrypt');

var utils = require('./utils');

var activitySchema = new mongoose.Schema({
  activityID: { type: String, required: true, index: { unique: true } },
  elderName: { type: String, required: true },
  status: { type: String, default: 'Available', required: true },
  volunteer: { type: String, required: false, ref: 'volunteerSchema' },
  resends: { type: Number, default: 1, required: true }
});

/* Create an entry for a new Emergency Food Package activity */
activitySchema.statics.newActivity = function(id, elderName, cb) {
  var Activity = this;
  Activity.findOne({ 'activityID': id }, function(err, act) {
    if (act) {
      cb({ success: false, message: 'Emergency request already exists' });
    } else {
      var new_act = new Activity({
        activityID: id,
        elderName: elderName,
      });
      new_act.save(function(err) {
        if (err) {
          cb({ success: false, message: 'Incorrect / nonexisting fields'});
        } else {
          cb({ success: true, message: 'Emergency request successfully added'});
        }
      });
    }
  });
};

/* Resend activity */

/* Update field (status, volunteer)
ACCEPT status: 'Scheduled', volunteer: [volunteer]
CANCEL status: 'Available', volunteer: '' --> call resend */
// activitySchema.statics.updateActivity = function(action, volunteer, cb) {

// };


Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity;
