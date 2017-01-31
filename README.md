# Little-Brothers-Web
##Web server for Little Brothers

####Introduction
Little Brothers Friends of the Elderly is a non-profit organization that provides emergency and scheduled assistance to elders in the program. This web application automates the process of providing
emergency assistance to elders by frequently checking the CiviCRM database for new requests and texting volunteers (via Plivo's SMS) to fulfill those requests. Based on volunteer responses,
emergency requests are completed and updated within the database. 

####Deployment Requirements
We deployed our [web application](https://lbfe.herokuapp.com/) to Heroku and used the add-on MongoLabs to use for database testing. There is no need for additional deployment steps unless you need to
conduct local tests or modify code (see "Local Deployment Requirements").

####Local Deployment Requirements
After pulling from Git, create a .env file in your project directory with the following information:
```
LB_URL='http://example.com'
LB_API_KEY='your api key'
LB_KEY='your site key'
PLIVO_AUTHID='your authid'
PLIVO_AUTHTOK='your authtoken'
PLIVO_NUMBER='your Plivo phone number with country code'
```

Add .env to your .gitignore file

Ensure npm is installed in the little-brothers-web directory and MongoDB is installed on the computer. Create a folder called "data" in little-brothers-web. In Command Prompt,
navigate to the little-brothers-web directory and run ```mongod --dbpath data```. Open a new Command Prompt window, navigate to little-brothers-web, and run ```npm start```.
**IMPORTANT: Even if running locally, the server will still send texts to all volunteers. When testing, it is best practice to comment out any calls to sendText().**

####Common Errors and How to Handle Them
If an error occurs during ```npm install``` or ```npm start``` saying that there is an issue with node-gyp or bcrypt:
Check if node and npm are up to date (can be done with ```node -v``` and ```npm -v``` respectively). If not up to date, update them.
If the error still occurs:
1. Run Command Prompt as an administrator. 
2. Navigate to little-brothers-web.
3. Type ```npm install --save bcryptjs && npm uninstall --save bcrypt```.
4. Go to the little-brothers-web directory and open the folder "node-modules".
5. Change the name of the folder called "bcryptjs" to "bcrypt".

We have found that Plivo's SMS service can at times be flaky to the point where it will not send texts to or receive texts from certain phone numbers for no apparent reason. Plivo's support team has been incredibly unhelpful with this issue and we have yet to find a workaround. Checking the [Plivo logs](https://manage.plivo.com/logs/messages/) can be helpful in determining the status of an SMS (sent or failed). Note that you must be logged into the LBFE Plivo account to use this feature.
In the future, it might be best to switch to a more reliable SMS service, such as Twilio. If this is done, the sendText() function in routes/index.js will need to be modified to the following:
```
function sendText(text, phone)
{
    client.messages.create({
        to: phone,
        from: process.env.TWILIO_NUMBER,
        body: text,
    }, function (err, message) {
        console.log(message.sid);
    });
}
```
Also in routes/index.js, replace this code:
```
// Initializing PlivoRestApi
var plivo = require('plivo');
var p = plivo.RestAPI({
  authId: process.env.PLIVO_AUTHID,
  authToken: process.env.PLIVO_AUTHTOK
});
```
with this code:
```
// Twilio Credentials
var accountSid = process.env.TWILIO_SID;
var authToken = process.env.TWILIO_AUTHTOKEN;

//require the Twilio module and create a REST client
var client = require('twilio')(accountSid, authToken);
```
Still in routes/index.js, modify the ```router.post('/replyToSMS', function(req, res, next) {``` in the following ways:
-replace ```var text = req.body.Text || req.query.Text;``` with ```var text = req.body.Body || req.query.Body;```
-replace ```var phoneNum = from_number.substring(1);``` with ```var phoneNum = from_number.substring(2);```
In the .env file, add the following:
```
TWILIO_SID='your SID'
TWILIO_AUTHTOKEN='your AuthToken'
TWILIO_NUMBER='your Twilio phone number with country code'
```
You can find these three values on your Twilio dashboard after creating an account and obtaining a phone number with SMS capability. Note that you will need to upgrade your account in order to maintain this app's functionality.
In the package.json file, add the following object to the ```dependencies``` array:
```
"twilio": "~3.0.0"
```
On the Twilio website, navigate to the [Console's Numbers page](https://www.twilio.com/console/phone-numbers/incoming). Click on the LBFE phone number and scroll down to the "Messaging" section. In the field that says "A MESSAGE COMES IN", type ```https://lbfe.herokuapp.com/replyToSMS```. Hit save.
The above changes will almost completely prepare the code for Twilio usage. There are two more fixes that will need to be made:
-In addition to the country code, Twilio requires a "+" at the beginning of every phone number. If there are any hard-coded phone numbers, add this "+". Also ensure that the "+" is added in formatPlivoNumber() (may want to rename this function)
####Helpful Resources
To query and update the CiviCRM database, refer to [CiviCRM API](https://wiki.civicrm.org/confluence/display/CRMDOC/API+Reference).

To incorporate SMS outbound and inbound text messages in our web application, refer to [Plivo API](https://www.plivo.com/docs/api/).