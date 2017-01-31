var mongoose = require('mongoose');
var bcrypt = require('bcrypt');
var utils = require('./utils');
var Volunteer = require('../models/volunteer');
var Admin = require('../models/admin'); 

var activitySchema = new mongoose.Schema({
  activityID: { type: String, required: true, index: { unique: true } },
  elderName: { type: String, required: true },
  elderAddress: { type: String, required: true },
  volunteer: { type: String, required: false, ref: 'volunteerSchema' },
  status: { type: String, default: 'Available', required: true },
  resends: { type: Number, default: 1, required: true },
  purchased: { type: String },
  toReimburse: { type: String }
});

/* Create an entry for a new Emergency Food Package activity */
activitySchema.statics.newActivity = function(id, elderName, elderAddress, cb) {
  var Activity = this;
  Activity.findOne({ 'activityID': id }, function(err, act) { 
    if (act) {
      cb({ success: false, message: 'Emergency request already exists' });
    } else {
      var new_act = new Activity({
        activityID: id,
        elderName: elderName,
        elderAddress: elderAddress
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
          cb({ success: false, message: '\"' + elderName + '\" does not match the name of any elder who currently requires assistance. Someone may have claimed this request before you, or this may be due to a spelling error.', sendMassText: false, civi: false });
        } else {
          var id = act.activityID;
          Activity.update({ 'activityID': id },
            { $set: { 'status': 'Scheduled', 'volunteer': volunteer.name } },
            function(err, result) {
              cb({ success: true, sendMassText: true, message: 'You have been assigned to deliver emergency groceries to ' + elderName + '. Please text \"COMPLETE ' + elderName + '\" upon completion or \"CANCEL ' + elderName + '\" to cancel.', civi: false });
          });
        }
      });
    } else if (action === 'complete') {
      Activity.findOne({ 'elderName': elderName, 'status': 'Scheduled', 'volunteer': volunteer.name }, function(err, act) {
        if (act === null) {
          cb({ success: false, message: 'Please check the spelling of the elder name, and text \"COMPLETE [last name, first name]\" to confirm completion.', sendMassText: false, civi: false });
        } else {
          var id = act.activityID;
          Activity.update({ 'activityID': id },
            { $set: { 'status': 'Completed' } },
            function(err, result) {
              cb({ success: true, sendMassText: false, message: 'Thank you for your service! Did you pick up the groceries from the LBFE pantry or purchase them from a grocery store? Please text \"PANTRY\" for pantry or \"PURCHASED\" for store.', civi: false });
          });
        }
      });
    } else if (action === 'cancel') {
      Activity.findOne({ 'elderName': elderName, 'status': 'Scheduled', 'volunteer': volunteer.name }, function(err, act) {
        if (act === null) {
          cb({ success: false, message: 'Please check the spelling of the elder name, and text \"CANCEL [last name, first name]\" to cancel.', sendMassText: false, civi: false });
        } else {
          var id = act.activityID;
          Activity.update({ 'activityID': id },
            { $set: { 'status': 'Available', 'volunteer': undefined } },
            function(err, result) {
              cb({ success: true, sendMassText: false, message: 'You have cancelled your assignment to deliver emergency grocieries to ' + elderName + '. We hope you are able to donate your time in the future.', civi: false });
          });
        }
      });
    } else if (action === 'pantry') {
      Activity.findOne({ 'status': 'Completed', 'volunteer': volunteer.name, 'purchased': undefined }, function(err, act) {
        if (act === null) {
          cb({ success: false, message: 'Invalid input. Please try again.', sendMassText: false, civi: false });
        } else { //CIVI NEEDS TO BE UPDATED SOMEWHERE IN HERE, and after civi is updated, this row should be deleted
          var id = act.activityID;
          Activity.update({ 'activityID': id },
        { $set: { 'purchased': 'no', 'toReimburse': 'no' } },
        function(err, result) {
          cb({ success: true, sendMassText: false, message: 'We have noted that you picked up the groceries from the LBFE pantry. Thank you!', civi: true});
        });
        }
      });
    } else if (action === 'purchased') {
      Activity.findOne({ 'status': 'Completed', 'volunteer': volunteer.name, 'purchased': undefined }, function(err, act) {
        if (act === null) {
          cb({ success: false, message: 'Invalid input. Please try again.', sendMassText: false, civi: false });
        } else {
          var id = act.activityID;
          Activity.update({ 'activityID': id },
        { $set: { 'purchased': 'yes' } },
        function(err, result) {
          cb({ success: true, sendMassText: false, message: 'Would you like to be reimbursed for your purchase? Please text \"YES\" or \"NO\"', civi: false });
        });
        }
      });
    } else if (action === 'yes') {
      Activity.findOne({ 'status': 'Completed', 'volunteer': volunteer.name, 'purchased': 'yes', 'toReimburse': undefined }, function(err, act) {
        if (act === null) {
          cb({ success: false, message: 'Invalid input. Please try again.', sendMassText: false, civi: false });
        } else { //CIVI NEEDS TO BE UPDATED SOMEWHERE IN HERE, and after civi is updated, this row should be deleted
          var id = act.activityID;
          Activity.update({ 'activityID': id },
        { $set: { 'toReimburse': 'yes' } },
        function(err, result) {
          cb({ success: true, sendMassText: false, message: 'We have noted that you are awaiting reimbursement. An LBFE staff member will be in contact with you shortly. Thank you!', civi: true });
        });
        }
      });
    } else if (action === 'no') {
      Activity.findOne({ 'status': 'Completed', 'volunteer': volunteer.name, 'purchased': 'yes', 'toReimburse': undefined }, function(err, act) {
        if (act === null) {
          cb({ success: false, message: 'Invalid input. Please try again.', sendMassText: false, civi: false });
        } else { //CIVI NEEDS TO BE UPDATED SOMEWHERE IN HERE, and after civi is updated, this row should be deleted
          var id = act.activityID;
          Activity.update({ 'activityID': id },
        { $set: { 'toReimburse': 'no' } },
        function(err, result) {
          cb({ success: true, sendMassText: false, message: 'We have noted that you chose to donate your purchased groceries. Thank you!', civi: true });
        });
        }
      });
    } else {
      cb({ success: false, message: 'Invalid input. Please try again.', sendMassText: false, civi: false });
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
        var eldername = current.elderName; 
        var elderAddress = current.elderAddress; 
        Activity.update({ 'activityID': id },
          { $set: { 'status': 'Completed', 'volunteer': 'Staff', 'purchased': 'no', 'toReimburse': 'no' } },
          function(err, result) {
            // cb({ success: true, phone: "", message: 'Changing activity status to COMPLETED' });
          });
        //Enter phone number of staff member in charge on manual assignment of requests
        //IMPORTANT: INCLUDE COUNTRY CODE in variable staffPhone
        var staffPhone = '14089159524'; 
        modifiedStaffPhone =  staffPhone.substring(1); 
        Admin.findOne({'phone': modifiedStaffPhone}, function(err, result) {
          if(result === null) {
            cb({ success: false, phone: "", message: 'Incorrect/ nonexisting fields'}); 
          } else {
            cb({ success: true, phone: staffPhone, message: 'Staff: No Volunteers have accepted a recent emergency food request. ' + eldername + ' at ' + elderAddress + ' urgently requires groceries.'}); 
          }
        })
      }
    }
  }); 
};

/* Resend activities to volunteers that have not been Scheduled and have not been resent 4 times */
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
        var eldername = current.elderName; 
        var elderAddress = current.elderAddress; 
        var resendCount = current.resends; 
        resendCount = resendCount + 1;

        Activity.update({ 'activityID': id },
          { $set: { 'resends': resendCount } },
          function(err, result) {
            cb({ success: true, message: '' + resendCount + '. Urgent Emergency Food Request: ' + eldername + ' at ' + elderAddress + ' urgently requires groceries.' }); 
          }
        );
      }
    }
  }); 
};

/* Checks for the completion of scheduled activities assigned to volunteers */
activitySchema.statics.checkActivityCompletion = function(cb) {
  var Activity = this; 
  Activity.find({'status': 'Scheduled'}, function(err, act) {
    if(act.length === 0) {
      cb({success: false, phone: "", message: "No activities are marked as scheduled"}); 
    } else {
      for(var i=0; i<act.length; i++) {
        var current = act[i]; 
        var id = current.activityID; 
        var eldername = current.elderName; 
        var elderAddress = current.elderAddress; 
        var volunteerName = current.volunteer; 
        Volunteer.findOne({'name': volunteerName}, function(err, result) {
          if(result === null) {
            cb({success: false, phone: "", message: 'Incorrect/ nonexisting fields'}); 
          } else {
            var volunteerPhone = result.phone; 
            var modifiedVolunteerPhone = "1" + volunteerPhone; 
            var note = 'You have accepted the emergency food request of ' + eldername + ' at ' + elderAddress + '. Please text \"COMPLETE ' + eldername + '\" once you have fulfilled the request. If you wish to cancel, please type \"CANCEL ' + eldername + '\".'
            cb({success: true, phone: modifiedVolunteerPhone, message: note}); 
          }
        })
      }    
    }
  }); 
}; 

/* Removes a completed activity from the database */
activitySchema.statics.removeActivity = function(cb) {
  var Activity = this;
  Activity.find({'status': 'Completed', 'purchased': {$exists: true}}, function(err, act) {
    if (act.length !== 0) {
      Activity.remove({'status': 'Completed'}, function(err, res) {
        cb({ success: true, message: 'Completed activities have been removed', removedActivities: act });
      });
    } else {
      cb({ success: false, message: 'No activities need to be removed', removedActivities: '' });
    }
  });
};

Activity = mongoose.model('Activity', activitySchema);
module.exports = Activity;
