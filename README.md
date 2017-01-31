# Little-Brothers-Web
##Web server for Little Brothers

####Introduction
Little Brothers Friends of the Elderly is a non-profit organization that provides emergency and scheduled assistance to elders in the program. This web application automates the process of providing emergency assistance to elders by frequently checking the CiviCRM database for new requests and texting volunteers (via Plivo's SMS) to fulfill those requests. Based on volunteer responses, emergency requests are completed and updated within the database. 

####Requirements
Create a .env file in your project directory, with the following information:

- LB_URL='http://example.com'
- LB_API_KEY='your api key'
- LB_KEY='your site key'
- PLIVO_AUTHID='your authid'
- PLIVO_AUTHTOK='your authtoken'
- PLIVO_NUMBER='your Plivo phone number with country code'

Add .env to your .gitignore file 

####Additional Information

We deployed our [web application](https://lbfe.herokuapp.com/) to Heroku and used the add-on MongoLabs to use for database testing


####Helpful Resources

To query and update the CiviCRM database, refer to [CiviCRM API](https://wiki.civicrm.org/confluence/display/CRMDOC/API+Reference)

To incorporate SMS outbound and inbound text messages in our web application, refer to [Plivo API](https://www.plivo.com/docs/api/)





