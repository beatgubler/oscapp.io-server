const mongoose = require('mongoose')

const Schema = mongoose.Schema
const userSchema = new Schema({
  email: String,
  password: String,
  avatar: String,
  blacklist: Boolean,
  lastLogin: Date
})

module.exports = mongoose.model('user', userSchema, 'users')