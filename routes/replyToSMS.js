var plivo = require('plivo');
var express = require('express');
var bodyParser = require('body-parser');
var app = express();

app.use(bodyParser.urlencoded({extended: true}));
app.set('port', (process.env.PORT || 5000));
app.all('/reply_to_sms/', function(request, response) {
    // Sender's phone number
    var from_number = request.body.From || request.query.From;
    // Receiver's phone number - Plivo number
    var to_number = request.body.To || request.query.To;
    // The text which was received
    var text = request.body.Text || request.query.Text;

    var params = {
        'src' : to_number, // Sender's phone number
        'dst' : from_number // Receiver's phone Number
    };
    var body = "Thanks, we've received your message.";

    var r = plivo.Response();
    r.addMessage(body, params);
    console.log (r.toXML());

    response.set({'Content-Type': 'text/xml'});
    response.end(r.toXML());
});

app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
});