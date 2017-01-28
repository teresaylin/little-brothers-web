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

// Send an SMS through Plivo
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

function getElderAddress(name, callback)
{
  crmAPI.get('contact', {sort_name: name, return:'street_address, city'},
    function (result) {
      var address = result.values[0].street_address + ", " + result.values[0].city;
      if (address === ", ") //if both the street address and the city are empty
      {
        address = "(NO ADDRESS PROVIDED)"
      }
      callback(name, address);
    }
  );
}

router.get('/volunteers', function (req, res, next) {
  var user = req.session.currentUser;
  var query = Volunteer.find({});

  query.exec(function (err, volunteers) {
      if (err) {
          throw Error;
      }
      res.render('volunteers', {volunteers: volunteers, user:user});
  });
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

  if (firstToken === "accept" || firstToken === "complete" || firstToken === "cancel") {
    var nameInText = splitText[1] + ' ' + splitText[2];
    Activity.updateActivity(firstToken, nameInText, phoneNum, function(data) {
      sendText(data.message, from_number);
    });
  } else {
    body = "Invalid input. Please try again.";
  }
  
  // sendText(body, from_number);
});

/* Querying civiCRM */
// custom_102 is the field for the name of the elder
// setInterval takes in a function and a delay
// delay is in milliseconds (1 sec = 1000 ms)


/* GET new emergency requests */
// Checks for new emergency requests every hour; if there are new requests, send text

// var timer_requests = setInterval(newRequests, 1000*60);

// newRequests();

function newRequests() {
  crmAPI.get('Activity', {activity_type_id:'Emergency Food Package', status_id:'Available', return:'custom_102,details,id'},
    function (result) {
      // if there exists available emergency food requests
      if (typeof result.values != 'undefined') {
        for (var i in result.values) {
          var val = result.values[i];
          var activityID = val.id;

          getElderAddress(val.custom_102, function(name, address) {
            var message = "New Emergency Food Request: " + name + " at " + address + " urgently requires groceries. ";
            if (typeof val.details != "undefined")
            {
              var additionalDetails = val.details.substring(3, val.details.length - 6); //substring of val.details cuts out the paragraph html tag (<p> and </p>)
              additionalDetails = additionalDetails.replace('&nbsp;',''); //cleaning up the carriage return, if it's in the details portion
              message = message + "Additional details: " + additionalDetails + " ";
            }
            message = message + "Reply \"ACCEPT " + name + "\" to accept this request."
            console.log(message);
            getVolunteerNumbers(function(numberString) {
              sendText(message, numberString);
            });
          });

          // Adding request to db if it has not been added
          Activity.newActivity(activityID, val.custom_102, function(data) {
            console.log(data.message);
          });
        }
      } else {
        console.log("No available emergency food requests at this time.");
      }
    }
  );
}

/*
UPDATING ACTIVITY STATUS IN CIVI
SPECIFY ID OF ACTVITY
CHANGE STATUS ID TO SCHEDULED OR COMPLETED 
*/
// crmAPI.call('Activity', 'create', {id:'68130', activity_type_id:'Emergency Food Package', status_id:'Available'},
//   function (result) {
//     console.log(result);
// }
// ); 


/* GET volunteers tagged with 'Emergency Food Package Volunteer': Name, Phone Number
Checks every 24 hours
tag ID of 'Emergency Food Package Volunteer' is 190
should return Teresa, Kristy, Stuti, Shana */

var timer_volunteers = setInterval(newVolunteers, 1000*60*24);
newVolunteers();

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
	crmAPI.get('contact', {tag:'190', return:'phone'},
    function (result) {
      var numberString = "";
      for (var i in result.values) {
        var number = result.values[i].phone;
        if (!(number === "")) //only add number if there is actually a number in the database
        {
          numberString += "1" + number + "<"; //Plivo requires < delimiter between different phone numbers; also assuming that volunteer lives in US
        }
      }
      numberString = numberString.substring(0, numberString.length - 1) //removing extraneous "<" character at end
      callback(numberString);
    });
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
        console.log(val.id + ": " + val.display_name + " " + val.phone);

        Admin.addAdmin(val.display_name, val.phone, function(data) {
          console.log(data.message);
        });
      }
    }
  );
}

module.exports = router;
