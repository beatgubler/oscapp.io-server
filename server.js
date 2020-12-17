// -----------------------------------------------------------------------------------------------------------------
// Express Server
const express = require('express')
const app = express()

const http = require('http')
const https = require('https')

const fs = require('fs')

var secrets = require('./secrets');
// console.log(secrets.crypto());
// console.log(secrets.jwt());
// console.log(secrets.mongodb());

// -----------------------------------------------------------------------------------------------------------------
// Multer(Upload) Config
const multer  = require('multer')
var storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, __dirname + '/avatar');
  }
});
var upload = multer({ 
  storage : storage,
  fileFilter: function (req, file, callback) {
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpeg' || file.mimetype === 'image/gif') {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  limits: { fileSize: 2 * 1024 * 1024 } //2 MB
}).single('file')

// -----------------------------------------------------------------------------------------------------------------
// Crypto Config
const crypto = require('crypto');
const iv = secrets.crypto().iv;
const password = secrets.crypto().password;

// -----------------------------------------------------------------------------------------------------------------
// Body Parser
const bodyParser = require('body-parser')
app.use(bodyParser.json())

// -----------------------------------------------------------------------------------------------------------------
// JSON WebToken
const jwt = require('jsonwebtoken')
const secret = secrets.jwt().secret

// -----------------------------------------------------------------------------------------------------------------
// Cross Origin Ressource Sharing
const cors = require('cors')
app.use(cors())

// -----------------------------------------------------------------------------------------------------------------
// Websocket initialization

const server = http.createServer(app).listen(3000, function () { console.log('Server running on localhost: ' + 3000) });

// const server = https.createServer({
//   key: fs.readFileSync('/etc/letsencrypt/live/chat.gubler-it.com/privkey.pem'),
//   cert: fs.readFileSync('/etc/letsencrypt/live/chat.gubler-it.com/fullchain.pem')
// }, app).listen(3000, function () { console.log('Server running on localhost: ' + 3000) });

const io = require('socket.io').listen(server);

io.on('connection', function (socket) {
  // console.log('a user connected');

  socket.on('message', function (msg) {
    io.emit('message', msg);
    // console.log(msg);
  });

  socket.on('disconnect', function () {
    // console.log('user disconnected');
  });

});

// -----------------------------------------------------------------------------------------------------------------
// MongoDB
const mongoose = require('mongoose')

const db = secrets.mongodb().db;

const ObjectId = require('mongodb').ObjectID;

mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);
mongoose.connect(db, err => {
  if (err) {
    console.error('Error: ' + err)
  } else {
    console.log('Connected to Chat DB')
  }
})

// -----------------------------------------------------------------------------------------------------------------
// Mongoose Models
const User = require('./models/user')
const Post = require('./models/post')

// -----------------------------------------------------------------------------------------------------------------
// Functions
function verifyJwt(req, res, next) {
  if(!req.headers.authorization){
    return res.status(401).send()
  }
  if(req.headers.authorization.includes('Bearer')){
    var splitToken = req.headers.authorization.split(" ")
    jwt.verify(splitToken[1], secret, function(err, decoded){
      if (err){
        // console.log(err)
        if(!req.headers.refreshtoken){
          return res.status(401).send()
        }
        if(req.headers.refreshtoken.includes('Bearer')){
          var splitRefreshToken = req.headers.refreshtoken.split(" ")
          jwt.verify(splitRefreshToken[1], secret, function(err, decoded){
            if (err){
              // console.log(err)
              return res.status(401).send()
            } else {
              User.findOne({ "_id": ObjectId(decoded._id), "blacklist": true }, (error, user) => {
                if (error) {
                  console.log(error)
                }
                if (user) {
                  return res.status(401).send()
                } else {
                  var decoded = decodeJwt(splitRefreshToken[1])
                  const jwtBearerToken = signJwt(decoded.email, decoded._id)
                  const jwtBearerRefreshToken = signRefreshJwt(decoded.email, decoded._id)
                  return res.status(401).send({'newToken': jwtBearerToken, 'newRefreshToken': jwtBearerRefreshToken})
                }
              })
            }
          })
        } else {
          return res.status(401).send()
        }
      } else {
        next();
      }
    })
  } else {
    return res.status(401).send()
  }
}

function signJwt(email, id){
  const jwtBearerToken = jwt.sign({"email": email, "_id": id}, secret, {
    expiresIn: 10 * 60, // 10 Minutes
  })
  return jwtBearerToken
}

function signRefreshJwt(email, id){
  const jwtBearerToken = jwt.sign({"email": email, "_id": id}, secret, {
    expiresIn: 60 * 60 * 24, // 1 Day
  })
  return jwtBearerToken
}

function decodeJwt(token) {
  const decoded = jwt.verify(token, secret)
  return decoded
}

function avatarSelector() {
  avatars = [
    "1",
    "2"
  ]
  randomNumber = Math.floor(Math.random() * Math.floor(2))
  return avatars[randomNumber]
}

function encryptPW(pw) {
  var mykey = crypto.createCipheriv('aes256', password, iv);
  var mystr = mykey.update(pw, 'utf8', 'hex');
  mystr += mykey.final('hex');

  return mystr;
}

function decryptPW(hash) {

  var mykey = crypto.createDecipheriv('aes256', password, iv);
  var mystr = mykey.update(hash, 'hex', 'utf8')
  mystr += mykey.final('utf8');

  return mystr;

}

// -----------------------------------------------------------------------------------------------------------------
// Routes

// -----------------------------------------------------------------------------------------------------------------
// Login / Register routes
app.post('/api/register', (req, res) => {
  let userData = req.body
  userData.email = userData.email.replace('/\s/g', '');
  let date = new Date()
  User.findOne({ email: { $regex: '^' + userData.email + '$', $options: 'i' } }, (error, user) => {
    if (error) {
      console.log(error)
    }
    if (user) {
      res.status(401).send({'customError':'User already exists'})
    } else {

      let user = new User({ "email": userData.email, "password": encryptPW(userData.password), "avatar": avatarSelector(), "blacklist": false, "lastLogin": date })
      user.save((error, registeredUser) => {
        if (error) {
          console.log(error)
        } else {
          const jwtBearerToken = signJwt(user.email, user._id)
          const jwtBearerRefreshToken = signRefreshJwt(user.email, user._id)
          res.status(200).send({jwtBearerToken, jwtBearerRefreshToken, "email": user.email, "_id": user._id})
        }
      })
    }
  })

})

app.post('/api/login', (req, res) => {
  let userData = req.body
  userData.email = userData.email.trim()
  let date = new Date()
  User.findOne({ email: { $regex: '^' + userData.email + '$', $options: 'i' }, "blacklist": false }, (error, user) => {
    if (error) {
      console.log(error)
    }
    if (!user) {
      res.status(401).send({'customError':'Wrong credentials'})
    } else if (decryptPW(user.password) !== userData.password) {
      res.status(401).send({'customError':'Wrong credentials'})
    } else {
      User.findOneAndUpdate({ "_id": ObjectId(user._id) }, { "lastLogin": date }, { new: true }, (error, response) => {

      })
      const jwtBearerToken = signJwt(user.email, user._id)
      const jwtBearerRefreshToken = signRefreshJwt(user.email, user._id)
      res.status(200).send({jwtBearerToken, jwtBearerRefreshToken, "email": user.email, "_id": user._id})
    }
  })
})

app.get('/api/token', verifyJwt, (req, res) => {
  var splitToken = req.headers.authorization.split(" ")
  var decoded = decodeJwt(splitToken[1])
  res.status(200).send({"email": decoded.email, "_id": decoded._id})
})

app.get('/api/tokenRefresh', verifyJwt, (req, res) => {
  var splitToken = req.headers.authorization.split(" ")
  var decoded = decodeJwt(splitToken[1])
  const jwtBearerToken = signJwt(decoded.email, decoded._id)
  res.status(200).send({jwtBearerToken})
})

// -----------------------------------------------------------------------------------------------------------------
// Chat routes
app.get('/api/posts', verifyJwt, (req, res) => {
  Post.find({}, (error, response) => {
    if (error) {
      console.log(error)
    } else {
      User.find({}, (error, user) => {
        if (error) {
          console.log(error)
        } else {
          for (i = 0; i < response.length; i++) {
            const result = user.find(function (element) {
              return element._id == response[i].userId
            })
            response[i].username = result.email
            response[i].avatar = result.avatar
          }
          res.status(200).send(response)
        }
      })
    }
  })
})

app.post('/api/posts', verifyJwt, (req, res) => {
  var splitToken = req.headers.authorization.split(" ")
  var decoded = decodeJwt(splitToken[1])
  var data = req.body
  if (data.content) {
    var message = new Post({'userId': decoded._id, 'content': data.content, 'timestamp': Date()})
    message.save((error, response) => {
      if (error) {
        console.log(error)
      } else {
        res.status(200).send(response)
      }
    })
  } else {
    res.status(401).send('wrong data')
  }
})

app.delete('/api/posts/:id', verifyJwt, (req, res) => {
  var splitToken = req.headers.authorization.split(" ")
  var decoded = decodeJwt(splitToken[1])
  if (decoded.email === 'admin') {
    Post.deleteOne({ "_id": ObjectId(req.params.id)}, (error, response) => {
      if (error) {
        console.log(error)
      } else {
        res.status(200).send(response)
      }
    })
  } else {
    Post.deleteOne({ "_id": ObjectId(req.params.id), 'userId': decoded._id }, (error, response) => {
      if (error) {
        console.log(error)
      } else {
        res.status(200).send(response)
      }
    })
  }
})

// -----------------------------------------------------------------------------------------------------------------
// Settings routes
app.get('/api/settings/', verifyJwt, (req, res) => {
  var splitToken = req.headers.authorization.split(" ")
  var decoded = decodeJwt(splitToken[1])

  User.findOne({ "_id": ObjectId(decoded._id) }, (error, response) => {
    if (error) {
      console.log(error)
    } else {
      res.status(200).send(response)
    }
  })

})

app.post('/api/settings/email/:id', verifyJwt, (req, res) => {
  var splitToken = req.headers.authorization.split(" ")
  var decoded = decodeJwt(splitToken[1])

  User.findOne({ email: { $regex: '^' + req.body.email + '$', $options: 'i' } }, (error, response) => {
    if (error) {
      console.log(error)
    } else {
      if (response) {
        res.status(200).send()
      } else {
        User.findOneAndUpdate({ "_id": ObjectId(decoded._id) }, { "email": req.body.email }, { new: true }, (error, response) => {
          const jwtBearerToken = signJwt(req.body.email, decoded._id)
          const jwtBearerRefreshToken = signRefreshJwt(req.body.email, decoded._id)
          res.status(200).send({jwtBearerToken, jwtBearerRefreshToken, "email": response.email})
        })
      }
    }
  })
})

app.post('/api/settings/password/:id', verifyJwt, (req, res) => {
  var splitToken = req.headers.authorization.split(" ")
  var decoded = decodeJwt(splitToken[1])
  User.findOneAndUpdate({ "_id": ObjectId(decoded._id) }, { "password": encryptPW(req.body.password) }, { new: true }, (error, response) => {
    res.status(200).send(response)
  })
})

app.post('/api/settings/avatar/', verifyJwt, (req, res) => {
  upload(req, res, function (err) {
    if (err) {
      return res.status(500).send(err.message)
    }
    if (req.file){
      var splitToken = req.headers.authorization.split(" ")
      var decoded = decodeJwt(splitToken[1])
      User.findOne({ "_id": ObjectId(decoded._id) }, (error, file) => {
        if (file.avatar != 1 && file.avatar != 2){
          fs.unlink(__dirname + '/avatar/' + file.avatar, (err) => {
            if (err) {
              console.error(err)
              return
            }
          })
        }
      })
      User.findOneAndUpdate({ "_id": ObjectId(decoded._id) }, { "avatar": req.file.filename}, { new: true }, (error, response) => {
        res.status(200).send(response)
      })
    } else {
      return res.status(200).send()
    }
  })
})


// -----------------------------------------------------------------------------------------------------------------
// Admin routes
app.get('/api/admin/users', verifyJwt, (req, res) => {
  var splitToken = req.headers.authorization.split(" ")
  var decoded = decodeJwt(splitToken[1])
  if (decoded.email === 'admin') {
    User.find({}, (error, response) => {
      if (error) {
        console.log(error)
      } else {
        res.status(200).send(response)
      }
    })
  } else {
    res.sendStatus(401)
  }
})

app.post('/api/admin/blacklist/', verifyJwt, (req, res) => {
  var splitToken = req.headers.authorization.split(" ")
  var decoded = decodeJwt(splitToken[1])
  if (decoded.email === 'admin') {
    User.findOneAndUpdate({ "_id": ObjectId(req.body.userId) }, { "blacklist": true}, { new: true }, (error, response) => {
      res.status(200).send(response)
    })
  } else {
    res.sendStatus(401)
  }
})

app.delete('/api/admin/blacklist/:id', verifyJwt, (req, res) => {
  var splitToken = req.headers.authorization.split(" ")
  var decoded = decodeJwt(splitToken[1])
  if (decoded.email === 'admin') {
    User.findOneAndUpdate({ "_id": ObjectId(req.params.id) }, { "blacklist": false}, { new: true }, (error, response) => {
      res.status(200).send(response)
    })
  } else {
    res.sendStatus(401)
  }
})

app.delete('/api/admin/users/:id', (req, res) => {
  var splitToken = req.headers.authorization.split(" ")
  var decoded = decodeJwt(splitToken[1])
  
  if (decoded.email === 'admin') {
    Post.deleteMany({ "userId": req.params.id }, (error, response) => {
      if (error) {
        console.log(error)
      }
    })
    User.findByIdAndDelete({ "_id": ObjectId(req.params.id) }, (error, response) => {
      if (error) {
        console.log(error)
      } else {
        res.status(200).send(response)
      }
    })
  } else {
    res.sendStatus(401)
  }
})

app.delete('/api/admin/messages', (req, res) => {
  var splitToken = req.headers.authorization.split(" ")
  var decoded = decodeJwt(splitToken[1])

  if (decoded.email === 'admin') {
    Post.deleteMany({}, (error, response) => {
      if (error) {
        console.log(error)
      } else {
        res.status(200).send(response)
      }
    })
  } else {
    res.sendStatus(401)
  }
})


// -----------------------------------------------------------------------------------------------------------------
// Avatar Images route
app.get('/api/avatar/:id', (req, res) => {
  res.sendFile(__dirname + '/avatar/' + req.params.id);
})