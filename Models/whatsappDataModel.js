const mongoose = require("mongoose");

const whatsappModel = new mongoose.Schema({
  From: String,
  To: String,
  Messages: [
    {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
      },
      timestamp:String,
      body: String,
      status: String,
      id: String
    },
  ],
});

module.exports = new mongoose.Model('whatsappModel',whatsappModel);