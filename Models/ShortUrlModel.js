const mongoose = require('mongoose');



const linkSchema = new mongoose.Schema({
    originalUrl: {
        type:String,
        required:true
      },
      shortUrl: {
        type:String,
        required: true
      },
      shortId: {
        type:String,
        required: true
      },
})
 

module.exports = mongoose.model('shortUrl', linkSchema);