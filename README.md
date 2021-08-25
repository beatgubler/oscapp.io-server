# oscapp.io Server/API

## Description
Main Project can be found here: https://github.com/beatgubler/oscapp.io

## Installation
* Install NodeJS -> https://nodejs.org/en/download/
* Install angular/cli -> **npm install -g @angular/cli**
* Clone this project with **git clone https://github.com/beatgubler/oscapp.io-server.git** or download manually
* change settings in secrets_template.js and change name into secrets.js
  * set crypto iv: const iv = "[random_string]" //max. 16 characters
  * set crypto password: const password = "[random_string]" 
  * set jwt secret: const secret = "[random_string]"
  * set MongoDB connection string: const db = "mongodb+srv://[username]:[password]@[cluster].mongodb.net/[database]?retryWrites=true&w=majority"
* **npm install** -> **node server**

## External dependencies
* express - https://www.npmjs.com/package/express
* body-parser - https://www.npmjs.com/package/body-parser
* jsonwebtoken - https://www.npmjs.com/package/jsonwebtoken
* cors - https://www.npmjs.com/package/cors
* socket.io - https://www.npmjs.com/package/socket.io
* mongoose - https://www.npmjs.com/package/mongoose
* multer - https://www.npmjs.com/package/multer

## Known issues
* none
