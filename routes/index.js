var express = require('express');
var bcrypt = require('bcrypt');
var router = express.Router();

var User = require('../models/user');
var Admin = require('../models/admin');
var Volunteer = require('../models/volunteer');
var Activity = require('../models/activity');

var secrets = require('dotenv').config();
var port = process.env.PORT || 8080;
// civiCRM API configuration using Node package 'civicrm'
var config = {
  server: process.env.LB_URL,
  path: '/sites/all/modules/civicrm/extern/rest.php',
  key: process.env.LB_KEY,
  api_key: process.env.LB_API_KEY
};
var crmAPI = require('civicrm')(config);

// Initializing PlivoRestApi
var plivo = require('plivo');
var p = plivo.RestAPI({
  authId: process.env.PLIVO_AUTHID,
  authToken: process.env.PLIVO_AUTHTOK
});

/*Send an SMS through Plivo
Input:
-text is a String representing the body of the SMS to be sent
-phone is a String representing the phone number to send the SMS to, with a country code ("1" for the US)
Output:
-no returns; attempts to send SMS with Plivo. Status of text can be checked at https://manage.plivo.com/logs/messages/ */
function sendText(text, phone)
{
  var params = {
      'src': process.env.PLIVO_NUMBER,
      'dst' : phone,
      'text' : text,
      'url': 'https://lbfe.herokuapp.com/plivo',
      'method': 'POST'
  };
  p.send_message(params, function (status, response) {
      console.log('Status: ', status);
      console.log('API Response:\n', response);
      console.log('Message UUID:\n', response['message_uuid']);
      console.log('Api ID:\n', response['api_id']);
  });
}

/*Given the name of an elder, provide their address from CiviCRM
Input:
-name is a String representing the name of the elder, formatted exactly how it appears in Civi ("lastname, firstname")
-callback is the function that gets executed upon completion of this function
Output:
-name is the exact same String as the parameter name. This needs to be passed into the callback to ensure that asynchronous calls don't mess up future outputs.
-address is the address that has been retrieved from Civi, in the format "street address, city" (or "(NO ADDRESS PROVIDED)" if there is no address in Civi for the elder)
*/
function getElderAddress(name, id, callback)
{
  crmAPI.get('contact', {sort_name: name, return:'name, street_address, city'},
    function (result) {
      var address = result.values[0].street_address + ", " + result.values[0].city;
      if (address === ", ") //if both the street address and the city are empty
      {
        address = "(NO ADDRESS PROVIDED)"
      }
      callback(name, address, id);
    }
  );
}

router.get('/volunteers', function (req, res, next) {
  var user = req.session.currentUser;
  if (user) { //if logged in
    var query = Volunteer.find({});
    query.exec(function (err, volunteers) {
      if (err) {
          throw Error;
      }
      res.render('volunteers', {user:user, volunteers: volunteers, message: ''});
    });
  } else { //redirect to login in page if not logged in
    res.redirect('/login');
  }
  
});

router.post('/delete', function(req, res, next) {
  var volunteerName = req.body.volunteer_name;
  var user = req.session.currentUser;
  Volunteer.removeVolunteer(volunteerName, function(data) {
    console.log(data.message);
    var query = Volunteer.find({});
    query.exec(function (err, volunteers) {
      if (err) {
          throw Error;
      }
      res.render('volunteers', {user:user, volunteers: volunteers, message: data.message,});
    });
  });
});

router.post('/addVolunteer', function(req, res, next) {
  var volunteerName = req.body.volunteer_name;
  var volunteerPhone = req.body.volunteer_phone;
  var user = req.session.currentUser;
  Volunteer.addVolunteer(volunteerName, volunteerPhone, function(data) {
    console.log(data.message);
    var query = Volunteer.find({});
    query.exec(function (err, volunteers) {
      if (err) {
          throw Error;
      }
      res.render('volunteers', {user:user, volunteers: volunteers, message: data.message});
    });
  });  
});

router.get('/activities', function (req, res, next) {
  var user = req.session.currentUser;
  if (user) { //if logged in
    var query = Activity.find({});

    query.exec(function (err, activities) {
        if (err) {
            throw Error;
        }
        res.render('activities', {activities: activities, user:user});
    });
  } else { //redirect to login in page if not logged in
    res.redirect('/login');
  }
});


/* GET home page. */
router.get('/', function(req, res, next) {
  var user = req.session.currentUser;
  if (user) {
    res.render('home', { user: user, message: '' });
  } else {
    res.render('index', { message: '' });
  }
});

router.get('/register', function(req, res, next) {
  res.render('register', { message: '' });
});

router.post('/register', function(req, res, next) {
  User.register(req.body.full_name,
                req.body.username,
                req.body.password,
                req.body.confirm_password,
                function(data) {
    if (data.success) {
      res.redirect('/login');
    } else {
      res.render('register', { message: data.message });
    }
  });
});

router.get('/login', function(req, res, next) {
  res.render('login', { message: '' });
});

router.post('/login', function(req, res, next) {
  var username = req.body.username;
  var password = req.body.password;

  User.authenticate(username, password, function(data) {
    if (data.success) {
      req.session.currentUser = data.user;
      res.redirect('/home');
    } else {
      res.render('login', { message: data.message });
    }
  });
});

router.get('/logout', function(req, res, next) {
  req.session.currentUser = undefined;
  res.redirect('/');
});

router.post('/plivo', function(req, res, next) {
  console.log(req.body);
});

router.post('/sms', function(req, res, next) {
  var message = req.body.text_message;
  var phone = req.body.phone_num;
  var user = req.session.currentUser;
  sendText(message, phone);  
  res.render('home', {user:user});
});

router.post('/changepwd', function(req, res, next) {
  var user = req.session.currentUser.username;
  var old = req.body.pwd_old;
  var new1 = req.body.pwd_new;
  var new2 = req.body.pwd_confirm;

  User.changePassword(user, old, new1, new2, function(data) {
    if (data.success) {
      res.render('login', { message: data.message });
    } else {
      res.render('user', { user: user, message: data.message });
    }
  });
});

/*Called whenever someone texts the Plivo number*/
router.post('/replyToSMS', function(req, res, next) {
  // Sender's phone number
  var from_number = req.body.From || req.query.From;
  // Receiver's phone number - Plivo number
  var to_number = req.body.To || req.query.To;
  // The text which was received
  var text = req.body.Text || req.query.Text;

  var body;

  var splitText = text.split(" ");
  var firstToken = splitText[0].toLowerCase();
  var phoneNum = from_number.substring(1);

  var nameInText = "";
  for (var index = 1; index < splitText.length; index++) //handles names that are more than two tokens, and ensures that just "purchase", "yes", etc. won't throw index out of bound error
  {
    nameInText += splitText[index] + " ";
  }
  nameInText = nameInText.substring(0, nameInText.length - 1); //remove last space
  Activity.updateActivity(firstToken, nameInText, phoneNum, function(data) {
    sendText(data.message, from_number);
    if (data.success && data.sendMassText) {
      getVolunteerNumbers(function(numberString) {
        message = "Resolved: Another volunteer has been assigned to provide emergency groceries for " + nameInText + ". They no longer require assistance."
        numbers = numberString.replace(from_number + "<", ''); //handles case where phone number is first or in the middle
        numbers = numbers.replace("<" + from_number, ''); //handles case where phone number is at end
        sendText(message, numbers);
      });
    } else if (data.success && data.civi) {
      removeCompleted();
    }
  });
});

/* Querying civiCRM */
// custom_102 is the field for the name of the elder
// setInterval takes in a function and a delay
// delay is in milliseconds (1 sec = 1000 ms)


/* GET new emergency requests */
// Checks for new emergency requests every hour; if there are new requests, send text
var timer_requests = setInterval(newRequests, 1000*60*2);

newRequests();

/*checks for available emergency food requests in CiviCRM, and sends a text message to all volunteers if there are any*/
function newRequests() {
  crmAPI.get('Activity', {activity_type_id:'Emergency Food Package', status_id:'Available', return:'custom_102,details,id'},
    function (result) {
      // if there exists available emergency food requests
      if (typeof result.values != 'undefined') {
        for (var i in result.values) {
          var val = result.values[i];

          getElderAddress(val.custom_102, val.id, function(name, address, id) {
            var message = "New Emergency Food Request: " + name + " at " + address + " urgently requires groceries. ";
            if (typeof val.details != "undefined")
            {
              var additionalDetails = val.details.substring(3, val.details.length - 6); //substring of val.details cuts out the paragraph html tag (<p> and </p>)
              additionalDetails = additionalDetails.replace('&nbsp;',''); //cleaning up the carriage return, if it's in the details portion
              message = message + "Additional details: " + additionalDetails + " ";
            }
            message = message + "Reply \"ACCEPT " + name + "\" to accept this request."

            Activity.newActivity(id, name, address, function(data) {
              console.log(data.message);
              if (data.success) {
                getVolunteerNumbers(function(numberString) {
                  sendText(message, numberString);
                  console.log(message);
                });
              }
            });
          });
        }
      } else {
        console.log("No available emergency food requests at this time.");
      }   
    }); 
}; 

/* Checks for unscheduled activities and lack of volunteer responses to requests*/
var timer_checkUnscheduled = setInterval(checkUnscheduled, 1000*60);

function checkUnscheduled() {
  Activity.noResponse(function(data) {
    if(data.success){
      var noResAct = data.noResponseAct;
      for (var i in noResAct) {
        var message = 'Staff: No volunteers have accepted a recent emergency food request. ' + noResAct[i].elderName + ' at ' + noResAct[i].elderAddress + ' urgently requires groceries.';
        sendText(message, data.phone);
      }
      removeCompleted();
    }
  });
  Activity.checkResends(function(data){
    if(data.success) {
        var volPhoneNums;
        var resAct = data.resendActivities;
        getVolunteerNumbers(function(callback) {
          volPhoneNums = callback;
          for (var i in resAct) {
            var message = 'RESEND #' + (resAct[i].resends+1) + '. Urgent Emergency Food Request: ' + resAct[i].elderName + ' at ' + resAct[i].elderAddress + ' urgently requires groceries.';
            sendText(message, volPhoneNums);
          }
        });
    }
  });
}

/* Checks for the completion of a scheduled activity assigned to a volunteer */
var timer_checkScheduled = setInterval(checkScheduled, 1000*60); 

function checkScheduled() {
  Activity.checkActivityCompletion(function(data) {
    if(data.success) {
      sendText(data.message, data.phone);
      console.log(data.message);
    }
  }); 
}

/*Updates the status of completed requests in CiviCRM.
Input:
-elderName is a String that represents the name of the elder who has successfully received their groceries, formatted how it is in Civi ("lastname, firstname")
-volunteer is a String that represents the name of the volunteer who successfully delivered the groceries
-purchased is a String that will say "yes" if the volunteer purchased the groceries at a store, or "no" if they picked it up at the LBFE pantry
-toReimburse is a String that will say "yes" if the volunteer wants to be reimbursed for buying groceries, or "no" if they are donating the groceries (or picked them up from the pantry)
Output:
-no returns; just updates CiviCRM, replacing the old request (with status "available") with a new request (with status "completed" and more details) that has all other information the same
*/
function updateCivi(id, elderName, volunteer, purchased, toReimburse, callback) {
  crmAPI.get('Activity', {activity_type_id:'Emergency Food Package', status_id: 'Available', return:'id,details,custom_102'},
    function (result) {
      if (typeof result.values != 'undefined') {
        for (var i in result.values) {
          var val = result.values[i];
          if (val.custom_102 === elderName) {
            var newDetails = val.details + "\n" + volunteer + " completed this task; they "
            if (purchased === "yes") {
              newDetails += "purchased groceries themselves and would ";
              if (toReimburse === "no") {
                newDetails += "not ";
              }
              newDetails += "like to be reimbursed.";
            } else {
              newDetails += "picked up groceries from the LBFE pantry.";
            }
            crmAPI.call('Activity', 'create', {id: val.id, status_id:'Completed', details: newDetails}, 
              function(result) {
                if (result['is_error'] === 0) {
                  callback(id);
                }
              }
            );
            break;
          }
        }
      } else {
        console.log("Activity not found.");
      }
    }
  );
}

/* GET volunteers tagged with 'Emergency Food Package Volunteer': Name, Phone Number
Checks every 24 hours
tag ID of 'Emergency Food Package Volunteer' is 190
should return Teresa, Kristy, Stuti, Shana */

//newVolunteers(); 

var timer_volunteers = setInterval(newVolunteers, 1000*60*60*24);

function newVolunteers() {
  crmAPI.get('contact', {tag:'190', return:'display_name,phone'},
    function (result) {
      for (var i in result.values) {
        val = result.values[i];
        Volunteer.addVolunteer(val.display_name, val.phone, function(data) {
          console.log(data.message);
        });
      }
    });
}


function getVolunteerNumbers(callback)
{
  Volunteer.getNumbers(function(data) {
    if (data.success) {
      var volunteerNumbers = data.numbers;
      formatPlivoNumber(volunteerNumbers, function(numberString) {
        callback(numberString);
      });
    } else {
      callback('');
    }
  })
}

function formatPlivoNumber(numbersList, cb) {
  var numberString = "";
  for (var i=0; i < numbersList.length; i++) {
    numberString += "1" + numbersList[i] + "<";
  }
  numberString = numberString.substring(0, numberString.length - 1) //removing extraneous "<" character at end
  numberString = numberString.replace(/-|\.|\(|\)/g, ""); //getting rid of delimiters that will mess with plivo
  cb(numberString);
}


/* GET Admins tagged with 'admin'
Checks every time website is visited
tag ID of 'admin' is 191
should return Teresa, Kristy, Stuti, Shana, Cynthia */
newAdmins();

function newAdmins() {
  crmAPI.get('contact', {tag:'191', options:{limit:50}, return:'display_name,phone'},
    function (result) {
      for (var i in result.values) {
        val = result.values[i];
        Admin.addAdmin(val.display_name, val.phone, function(data) {});
      }
    }
  );
}

/* Remove Completed activities and updates Civi */
function removeCompleted() {
  Activity.find({'status': 'Completed', 'toReimburse': {$exists: true}}, function(err, act) {
    if (act.length !== 0) {
      for (var i in act) {
        var activity = act[i];
        updateCivi(activity.activityID, activity.elderName, activity.volunteer, activity.purchased, activity.toReimburse, function(id) {
          Activity.remove({'activityID': id}, function(err, res) {
            console.log('Completed activity has been removed');
          });
        });
      }
    } else {
      console.log('No activities need to be removed');
    }
  });
}

module.exports = router;
