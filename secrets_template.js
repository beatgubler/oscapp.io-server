const crypto = () => {
  return {iv: "", password: ""};
};
exports.crypto = crypto;


const jwt = () => {
  return {secret: ""};
};
exports.jwt = jwt;


const mongodb = () => {
  const db = "mongodb+srv://[username]:[password]@[mongo-string]?retryWrites=true&w=majority"
  return {db: db};
};
exports.mongodb = mongodb;