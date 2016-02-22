#Forum
This forum was designed to fit the requirements of the storyboard as well as the verifications outlined in the competition rules

## Set up
Refer to the original README in the root folder to see instructions on deployment.
I added code to the generate-env.js file in the Postman file to add spaces for forum variables
- Section1
- Section2
- Thread1
- Thread2
- Post1
- Post2
You will need to create sections, threads, and posts, then set these variables to test the forum API. The user variables used are USER1 USER2 and ANDIM; make sure that these are set as well.

## All changes
- Modified generate-env.js to make space for forum environmental variables.
- Modified app.js to add initialize for forum api
- Modified User Schema to include nickname and the number of posts. Nickname default is firstName+LastName (as specified in the docs) and the default number of threads is zero. Simply regenerate test data for the database will update the users in the models automatically, as requested in the docs.


## Tests
To test to forum api, run 'grunt test' in the mom_api directory. If you want to only test the forum api, then run 'mocha test/forum' and all of the mocha specific tests will run.

## Notes
I used to the mongoose.model() method in the user definition to automatically add add/remove methods to the models. I only made custom methods to remove associations between the models--like sections and threads--that weren't automatically done by the mongoose.model() method.

Because I used the mongoose.model() method with the User model, the database automatically generated associations with the existing User model. By using the populate method, it would get the user by their Id. The database only had to store the user Ids and would be able to easily get the User document by using the populate() method. 

Instead of using controllers only I used the express router variable combined with controllers because it supports middleware. It make is much simpler to check ownership of threads and posts. 

