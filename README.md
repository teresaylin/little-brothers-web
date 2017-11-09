# Little-Brothers-Web
## Web server for Little Brothers

#### Introduction
Little Brothers Friends of the Elderly is a non-profit organization that provides emergency and scheduled assistance to elders in the program. This web application automates the process of providing
emergency assistance to elders by frequently checking the CiviCRM database for new requests and texting volunteers (via Plivo's SMS) to fulfill those requests. Based on volunteer responses,
emergency requests are completed and updated within the database. 

Access is limited to Boston Little Brothers admins. However, a demo of the application - and how it interfaces with the CiviCRM database and users - can be seen [here](https://www.youtube.com/watch?v=H4MbXbBYpg0).

#### Deployment Requirements
We deployed our [web application](https://lbfe.herokuapp.com/) to Heroku and used the add-on MongoLabs to use for database testing. There is no need for additional deployment steps unless you need to
conduct local tests or modify code (see "Local Deployment Requirements").

**If you modify code, make sure to push it to Heroku for changes to take effect!**

#### Local Deployment Requirements
After pulling from Git, create a .env file in your project directory with the following information:
```
LB_URL='http://example.com'
LB_API_KEY='your api key'
LB_KEY='your site key'
PLIVO_AUTHID='your authid'
PLIVO_AUTHTOK='your authtoken'
PLIVO_NUMBER='your Plivo phone number with country code (e.g. "12223334444")'
TWILIO_SID='your SID'
TWILIO_AUTHTOKEN='your AuthToken'
TWILIO_NUMBER='your Twilio phone number with country code and + (e.g. "+12223334444")'
```

Add .env to your .gitignore file

Ensure npm is installed in the little-brothers-web directory and MongoDB is installed on the computer. Create a folder called "data" in little-brothers-web. In Command Prompt,
navigate to the little-brothers-web directory and run ```mongod --dbpath data```. Open a new Command Prompt window, navigate to little-brothers-web, and run ```npm start```.
**IMPORTANT: Even if running locally, the server will still send texts to all volunteers. When testing, it is best practice to comment out any calls to sendText().**

#### Common Errors and How to Handle Them
If an error occurs during ```npm install``` or ```npm start``` saying that there is an issue with node-gyp or bcrypt:
Check if node and npm are up to date (can be done with ```node -v``` and ```npm -v``` respectively). If not up to date, update them.
If the error still occurs:

1. Run Command Prompt as an administrator. 
2. Navigate to little-brothers-web.
3. Type ```npm install --save bcryptjs && npm uninstall --save bcrypt```.
4. Go to the little-brothers-web directory and open the folder "node-modules".
5. Change the name of the folder called "bcryptjs" to "bcrypt".

We have found that Plivo's SMS service can at times be flaky to the point where it will not send texts to or receive texts from certain phone numbers for no apparent reason. Plivo's support team has
been incredibly unhelpful with this issue and we have yet to find a workaround. Checking the [Plivo logs](https://manage.plivo.com/logs/messages/) can be helpful in determining the status of an SMS
(sent or failed). Note that you must be logged into the LBFE Plivo account to use this feature.
In the future, it might be best to switch to a more reliable SMS service, such as Twilio. If this is done, switch to the Twilio versions of the following code by uncommenting lines preceded by
```/*TWILIO VERSION*/``` and commenting lines preceded by ```/*PLIVO VERSION*/```:

- initializing Plivo/Twilio in routes/index.js
- ```sendText()``` in routes/index.js
- ```router.post('/replyToSMS')``` in routes/index.js (3 changes)
- ```getVolunteerNumbers()``` in routes/index.js
- variable ```countryCode``` in models/activity.js


On the Twilio website, navigate to the [Console's Numbers page](https://www.twilio.com/console/phone-numbers/incoming). Click on the LBFE phone number and scroll down to the "Messaging" section.
In the field that says "A MESSAGE COMES IN", ensure that the URL is ```https://lbfe.herokuapp.com/replyToSMS```.

#### A Quick Note on Timers
We foresee that a modification that LBFE is most likely to want to make would be changing the timing of text alerts/reminders. Here is a list of all the timers that our program uses:

- ```timer_requests``` (how long to wait before looking for new Emergency Food Requests in CiviCRM)
- ```timer_checkUnscheduled``` (how long to wait before resending unclaimed requests)
- ```timer_checkScheduled``` (how long to wait before reminding a volunteer to complete their assignment)
- ```timer_checkPantry``` (how long to wait before asking a volunteer if they purchased the groceries again)
- ```timer_checkReimburse``` (how long to wait before asking a volunteer if they would like to be reimbursed again)
- ```timer_volunteers``` (how long to wait before checking for new volunteers to add to Mongo database)

If you would like to change the amount of time to wait before executing any of these tasks, find the line in routes/index.js where the appropriate timer is instantiated and change the second
parameter of setInterval. Note that setInterval takes the amount of time in **milliseconds**. We recommend inputting the time to wait as follows: ```1000*seconds*minutes*hours*days```. For example, 3
minutes becomes ```1000*60*3```, 1 hour becomes ```1000*60*60```, and 1 day becomes ```1000*60*60*24```.

#### Helpful Resources
To query and update the CiviCRM database, refer to [CiviCRM API](https://wiki.civicrm.org/confluence/display/CRMDOC/API+Reference).

To incorporate SMS outbound and inbound text messages in our web application, refer to [Plivo API](https://www.plivo.com/docs/api/).