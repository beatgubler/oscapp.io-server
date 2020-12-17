const mongoose = require('mongoose')

const Schema = mongoose.Schema
const postSchema = new Schema({
  userId: String,
  username: String,
  avatar: String,
  content: String,
  timestamp: String
})

module.exports = mongoose.model('post', postSchema, 'posts')