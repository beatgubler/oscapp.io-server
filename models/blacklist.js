const mongoose = require('mongoose')

const Schema = mongoose.Schema
const blacklistSchema = new Schema({
  userId: String
})

module.exports = mongoose.model('blacklist', blacklistSchema, 'blacklist')