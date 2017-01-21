var mongoose = require('mongoose');
var bcrypt = require('bcrypt');

var utils = require('./utils');

var volunteerSchema = new mongoose.Schema({
  name: { type: String, required: true, index: { unique: true } },
  phone: { type: String, required: true },
});

Volunteer = mongoose.model('Volunteer', volunteerSchema);

module.exports = Volunteer;
