var mongoose = require('mongoose');
var bcrypt = require('bcrypt');
var utils = require('./utils');
var Volunteer = require('../models/volunteer');
var Admin = require('../models/admin'); 

var activitySchema = new mongoose.Schema({
  activityID: { type: String, required: true, index: { unique: true } },
  elderName: { type: String, required: true },
  status: { type: String, default: 'Available', required: true },
  volunteer: { type: String, required: false, ref: 'volunteerSchema' },
  resends: { type: Number, default: 1, required: true },
  purchased: { type: String },
  toReimburse: { type: String }
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



/* Update the activity based on volunteer's action */
activitySchema.statics.updateActivity = function(action, elderName, vol_phone, cb) {
  var Activity = this;

  Volunteer.findOne({ 'phone': vol_phone }, function(err, volunteer) {
    if (action === 'accept') {
      Activity.findOne({ 'elderName': elderName, 'status': 'Available' }, function(err, act) {
        if (act === null) {
          cb({ success: false, message: elderName + 'does not match the name of any elder who currently requires assistance. Someone may have claimed this request before you, or this may be due to a spelling error.' });
        } else {
          var id = act.activityID;
          Activity.update({ 'activityID': id },
            { $set: { 'status': 'Scheduled', 'volunteer': volunteer.name } },
            function(err, result) {
              cb({ success: true, message: 'You have been assigned to deliver emergency groceries to ' + elderName + '. Please text \"COMPLETE ' + elderName + '\" upon completion or \"CANCEL ' + elderName + '\" to cancel.' });
          });
        }
      });
    } else if (action === 'complete') {
      Activity.findOne({ 'elderName': elderName, 'status': 'Scheduled', 'volunteer': volunteer.name }, function(err, act) {
        if (act === null) {
          cb({ success: false, message: 'Please check the spelling of the elder name, and text \"COMPLETE [last name, first name]\" to confirm completion.' });
        } else {
          var id = act.activityID;
          Activity.update({ 'activityID': id },
            { $set: { 'status': 'Completed' } },
            function(err, result) {
              cb({ success: true, message: 'Thank you for your service!' });
          });
        }
      });
    } else if (action === 'cancel') {
      Activity.findOne({ 'elderName': elderName, 'status': 'Scheduled', 'volunteer': volunteer.name }, function(err, act) {
        if (act === null) {
          cb({ success: false, message: 'Please check the spelling of the elder name, and text \"CANCEL [last name, first name]\" to cancel.' });
        } else {
          var id = act.activityID;
          Activity.update({ 'activityID': id },
            { $set: { 'status': 'Available', 'volunteer': undefined } },
            function(err, result) {
              cb({ success: true, message: 'You have cancelled your assignment to deliver emergency grocieries to ' + elderName + '. We hope you are able to donate your time in the future.' });
          });
        }
      });
    }
  });
};


/* Resends activity */

/* No volunteer response --> send request to staff */
activitySchema.statics.noResponse = function(cb) {
  var Activity = this; 
  Activity.find({'resends': 3}, function(err, act) {
    if(act.length === 0) {
      cb({ success: false, phone: "", message: 'No staff needs to be assigned to the request yet'})
    } else {
      //sends text to staff for every activity that's been resended 3 times
      for(var i=0; i<act.length; i++) {
        var current = act[i];
        var id = current.activityID;
        Activity.update({ 'activityID': id },
          { $set: { 'status': 'Completed' } },
          function(err, result) {
            cb({ success: true, message: 'Changing activity status to COMPLETED' });
          });
        //Enter phone number of staff member in charge on manual assignment of requests
        Admin.findOne({'phone': '1234569524'}, function(err, result) {
          if(result === null) {
            cb({ success: false, phone: "", message: 'Incorrect/ nonexisting fields'}); 
          } else {
            cb({ success: true, phone: result.phone, message: 'Staff: Jane Doe urgently requires groceries'}); 
          }
        })
      }
    }
  }); 
};

/* No volunteer response and resends less than 3 */
activitySchema.statics.checkResends = function(cb) {
  var Activity = this; 
  Activity.find({'status': 'Available', 'resends': {$lt: 3}}, function(err, act) {
    if(act.length === 0) {
      cb({ success: false, message: "no activities with resends less than 3"}); 
    } else {
      //increases resend count and sends text to volunteers every hour
      for(var i=0; i<act.length; i++) {
        var current = act[i]; 
        var id = current.activityID; 
        var resendCount = current.resends; 
        resendCount = resendCount + 1;
        Activity.update({ 'activityID': id },
          { $set: { 'resends': resendCount } },
          function(err, result) {
            cb({ success: true, message: 'Volunteers: Jane Doe urgently requires groceries' });
          }
        );
      }
    }
  }); 
}; 


Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity;
