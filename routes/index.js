var express = require('express');
var bcrypt = require('bcrypt');
var router = express.Router();
var secrets = require('dotenv').config();

var User = require('../models/user');
var Volunteer = require('../models/volunteer');
var Activity = require('../models/activity');
var lbfe = require('./lbfe');

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

router.get('/volunteers', function (req, res, next) {
  var user = req.session.currentUser;
  if (user) {
    var query = Volunteer.find({});
    query.exec(function (err, volunteers) {
      if (err) {
        throw Error;
      }
      res.render('volunteers', {user: user, volunteers: volunteers, message: ''});
    });
  } else {
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
      res.render('volunteers', {user: user, volunteers: volunteers, message: data.message,});
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
      res.render('volunteers', {user: user, volunteers: volunteers, message: data.message});
    });
  });  
});

router.get('/activities', function (req, res, next) {
  var user = req.session.currentUser;
  if (user) {
    var query = Activity.find({});

    query.exec(function (err, activities) {
        if (err) {
            throw Error;
        }
        res.render('activities', {activities: activities, user:user});
    });
  } else {
    res.redirect('/login');
  }
});

router.post('/plivo', function(req, res, next) {
  console.log(req.body);
});

router.post('/sms', function(req, res, next) {
  var message = req.body.text_message;
  var phone = req.body.phone_num;
  var user = req.session.currentUser;
  lbfe.sendText(message, phone);  
  res.render('home', {user: user});
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

/*Called whenever someone texts the number*/
router.post('/replyToSMS', function(req, res, next) {
  console.log("message received");
  // Sender's phone number
  var from_number = req.body.From || req.query.From;
  // Receiver's phone number - Plivo number
  var to_number = req.body.To || req.query.To;

  // The text which was received
  /*PLIVO VERSION*/
  /*var text = req.body.Text || req.query.Text;*/
  /*END PLIVO VERSION*/

  /*TWILIO VERSION*/
  var text = req.body.Body || req.query.Body;
  /*END TWILIO VERSION*/

  console.log(from_number);
  console.log(text);

  var body;

  var splitText = text.split(" ");
  var firstToken = splitText[0].toLowerCase();

  /*PLIVO VERSION*/
  /*var phoneNum = from_number.substring(1);*/
  /*END PLIVO VERSION*/

  /*TWILIO  VERSION*/
  var phoneNum = from_number.substring(2);
  /*END TWILIO VERSION*/

  var nameInText = "";
  //handles names that are more than two tokens, and ensures that just "purchase", "yes", etc. won't throw index out of bound error
  for (var index = 1; index < splitText.length; index++) {
    nameInText += splitText[index] + " ";
  }
  nameInText = nameInText.substring(0, nameInText.length - 1); //remove last space
  Activity.updateActivity(firstToken, nameInText, phoneNum, function(data) {
    lbfe.sendText(data.message, from_number);
    if (data.success && data.sendMassText) {
      lbfe.getVolunteerNumbers(function(numberString) {
        message = "Resolved: Another volunteer has been assigned to provide emergency groceries for " + nameInText + ". They no longer require assistance."

        /*PLIVO VERSION*/
        /*var numbers = numberString.replace(from_number + "<", ''); //handles case where phone number is first or in the middle
        numbers = numbers.replace("<" + from_number, ''); //handles case where phone number is at end*/
        /*END PLIVO VERSION*/

        /*TWILIO VERSION*/
        var numbers = [];
        for (var i = 0; i < numberString.length; i++) {
          if (numberString[i] !== from_number) {
            numbers.push(numberString[i]);
          }
        }
        /*END TWILIO VERSION*/

        lbfe.sendText(message, numbers);
      });
    } else if (data.success && data.civi) {
      lbfe.removeCompleted();
    }
  });
});


module.exports = router;
