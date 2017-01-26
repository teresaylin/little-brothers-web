var express = require('express');
var bcrypt = require('bcrypt');
var router = express.Router();
var querystring = require('querystring');
var http = require('http');

var User = require('../models/user');
var Admin = require('../models/admin');
var Volunteer = require('../models/volunteer');

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
var url = 'https://api.plivo.com/v1/Account/';

// Send an SMS through Plivo
function sendText(text)
{
  var params = {
      'src': process.env.PLIVO_NUMBER,
      'dst' : '18176892020',
      'text' : text
      // 'url': 'https://lbfe.herokuapp.com/plivo',
      // 'method': 'POST'      
  };
  p.send_message(params, function (status, response) {
      console.log('Status: ', status);
      console.log('API Response:\n', response);
      console.log('Message UUID:\n', response['message_uuid']);
      console.log('Api ID:\n', response['api_id']);
  });

  var post_data = querystring.stringify(params);

  // Where to post to
  var post_options = {
    host: 'lbfe.herokuapp.com',
    path: '/plivo',
    port: port,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  };

  // Set up the request
  var post_req = http.request(post_options, function(res) {
    res.setEncoding('utf8');
    res.on('data', function(response) {
      console.log('Response: ' + response);
    })
  });

  // Post the data
  post_req.write(post_data);
  post_req.end();
}

function getElderAddress(name, callback)
{
  crmAPI.get('contact', {sort_name: name, return:'street_address, city'},
    function (result) {
      var address = result.values[0].street_address + ", " + result.values[0].city;
      callback(address)
    }
  );
}

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
  console.log(req);
});

router.post('/sms', function(req, res, next) {
  var message = req.body.text_message;
  console.log(message);
  var user = req.session.currentUser;
  sendText(message);
  res.render('home', { user: user });
})

/* Querying civiCRM */
// custom_102 is the field for the name of the elder
// setInterval takes in a function and a delay
// delay is in milliseconds (1 sec = 1000 ms)


/* GET new emergency requests */
// Checks for new emergency requests every hour; if there are new requests, send text

var timer_requests = setInterval(newRequests, 1000*60);

function newRequests() {
  crmAPI.get('Activity', {activity_type_id:'Emergency Food Package', status_id:'Available', return:'custom_102,location,phone_number,details'},
    function (result) {
      // if there exists available emergency food requests
      if (typeof result.values != 'undefined') {
        for (var i in result.values) {
          val = result.values[i];
          getElderAddress(val.custom_102, function(address) {
            var message = "New Emergency Food Request: " + val.custom_102 + " at " + address + " urgently requires groceries. ";
            if (typeof val.details != "undefined")
            {
              var additionalDetails = val.details.substring(3, val.details.length - 6); //substring of val.details cuts out the paragraph html tag (<p> and </p>)
              additionalDetails.replace('&nbsp;',''); //cleaning up the carriage return, if it's in the details portion
              message = message + "Additional details: " + additionalDetails + " ";
            }
            message = message + "Reply \"ACCEPT\" to accept this request."
            console.log(message);
            //sendText(message);
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
