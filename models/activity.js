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
          cb({ success: false, message: elderName + ' does not match the name of any elder who currently requires assistance. Someone may have claimed this request before you, or this may be due to a spelling error.' });
        } else {
          var id = act.activityID;
          Activity.update({ 'activityID': id },
            { $set: { 'status': 'Scheduled', 'volunteer': volunteer.name } },
            function(err, result) {
              cb({ success: true, sendMassText: true, message: 'You have been assigned to deliver emergency groceries to ' + elderName + '. Please text \"COMPLETE ' + elderName + '\" upon completion or \"CANCEL ' + elderName + '\" to cancel.' });
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
              cb({ success: true, sendMassText: false, message: 'Thank you for your service! Did you pick up the groceries from the LBFE pantry or purchase them from a grocery store? Please text \"PANTRY\" for pantry or \"PURCHASED\" for store.' });
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
              cb({ success: true, sendMassText: false, message: 'You have cancelled your assignment to deliver emergency grocieries to ' + elderName + '. We hope you are able to donate your time in the future.' });
          });
        }
      });
    } else if (action === 'pantry') {
      Activity.findOne({ 'status': 'Completed', 'volunteer': volunteer.name, 'purchased': undefined }, function(err, act) {
        if (act === null) {
          cb({ success: false, message: 'Invalid input. Please try again.'});
        } else { //CIVI NEEDS TO BE UPDATED SOMEWHERE IN HERE, and after civi is updated, this row should be deleted
          var id = act.activityID;
          Activity.update({ 'activityID': id },
        { $set: { 'purchased': 'no', 'toReimburse': 'no' } },
        function(err, result) {
          cb({ success: true, sendMassText: false, message: 'We have noted that you picked up the groceries from the LBFE pantry. Thank you!'});
        });
        }
      });
    } else if (action === 'purchased') {
      Activity.findOne({ 'status': 'Completed', 'volunteer': volunteer.name, 'purchased': undefined }, function(err, act) {
        if (act === null) {
          cb({ success: false, message: 'Invalid input. Please try again.'});
        } else {
          var id = act.activityID;
          Activity.update({ 'activityID': id },
        { $set: { 'purchased': 'yes' } },
        function(err, result) {
          cb({ success: true, sendMassText: false, message: 'Would you like to be reimbursed for your purchase? Please text \"YES\" or \"NO\"'});
        });
        }
      });
    } else if (action === 'yes') {
      Activity.findOne({ 'status': 'Completed', 'volunteer': volunteer.name, 'purchased': 'yes', 'toReimburse': undefined }, function(err, act) {
        if (act === null) {
          cb({ success: false, message: 'Invalid input. Please try again.'});
        } else { //CIVI NEEDS TO BE UPDATED SOMEWHERE IN HERE, and after civi is updated, this row should be deleted
          var id = act.activityID;
          Activity.update({ 'activityID': id },
        { $set: { 'toReimburse': 'yes' } },
        function(err, result) {
          cb({ success: true, sendMassText: false, message: 'We have noted that you are awaiting reimbursement. An LBFE staff member will be in contact with you shortly. Thank you!'});
        });
        }
      });
    } else if (action === 'no') {
      Activity.findOne({ 'status': 'Completed', 'volunteer': volunteer.name, 'purchased': 'yes', 'toReimburse': undefined }, function(err, act) {
        if (act === null) {
          cb({ success: false, message: 'Invalid input. Please try again.'});
        } else { //CIVI NEEDS TO BE UPDATED SOMEWHERE IN HERE, and after civi is updated, this row should be deleted
          var id = act.activityID;
          Activity.update({ 'activityID': id },
        { $set: { 'toReimburse': 'no' } },
        function(err, result) {
          cb({ success: true, sendMassText: false, message: 'We have noted that you chose to donate your purchased groceries. Thank you!'});
        });
        }
      });
    } else {
      cb({ success: false, message: 'Invalid input. Please try again.'});
    }
  });
};

/* No volunteer response after 3 resends --> send request to staff */
activitySchema.statics.noResponse = function(cb) {
  var Activity = this; 
  Activity.find({'resends': 4, 'status': 'Available'}, function(err, act) {
    if(act.length === 0) {
      cb({ success: false, phone: "", message: 'No activities need to be sent to Staff.'})
    } else {
      //sends text to staff for every activity that's been resent 3 times
      for(var i=0; i<act.length; i++) {
        var current = act[i];
        var id = current.activityID;
        Activity.update({ 'activityID': id },
          { $set: { 'status': 'Completed', 'volunteer': 'Staff' } },
          function(err, result) {
            // cb({ success: true, phone: "", message: 'Changing activity status to COMPLETED' });
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

/* Resend activities that have not been Scheduled and have not been resent 4 times */
activitySchema.statics.checkResends = function(cb) {
  var Activity = this; 
  Activity.find({'status': 'Available', 'resends': {$lt: 4}}, function(err, act) {
    if(act.length === 0) {
      cb({ success: false, message: "All activities have been completed or scheduled to Staff"}); 
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
