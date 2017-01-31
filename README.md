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

- LB_URL='http://example.com'
- LB_API_KEY='your api key'
- LB_KEY='your site key'
- PLIVO_AUTHID='your authid'
- PLIVO_AUTHTOK='your authtoken'
- PLIVO_NUMBER='your Plivo phone number with country code'

Add .env to your .gitignore file

Ensure npm is installed in the little-brothers-web directory and MongoDB is installed on the computer. Create a folder called "data" in little-brothers-web. In Command Prompt,
navigate to the little-brothers-web directory and run ```mongod --dbpath data```. Open a new Command Prompt window, navigate to little-brothers-web, and run ```npm start```.
**IMPORTANT: Even if running locally, the server will still send texts to all volunteers. When testing, it is best practice to comment out any calls to sendText().**

####Additional Information
If an error occurs during ```npm install``` or ```npm start``` saying that there is an issue with node-gyp or bcrypt:
Check if node and npm are up to date (can be done with ```node -v``` and ```npm -v``` respectively). If not up to date, update them.
If the error still occurs:
1. Run Command Prompt as an administrator. 
2. Navigate to little-brothers-web.
3. Type ```npm install --save bcryptjs && npm uninstall --save bcrypt```.
4. Go to the little-brothers-web directory and open the folder "node-modules".
5. Change the name of the folder called "bcryptjs" to "bcrypt".


####Helpful Resources
To query and update the CiviCRM database, refer to [CiviCRM API](https://wiki.civicrm.org/confluence/display/CRMDOC/API+Reference).

To incorporate SMS outbound and inbound text messages in our web application, refer to [Plivo API](https://www.plivo.com/docs/api/).


