const mongoose = require('mongoose');

const TrackRequestKidneySchema = new mongoose.Schema({
  ids: [
    {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      status: {
        type: Boolean,
        default: false,
      }
    }
  ]
});

module.exports = mongoose.model('TrackRequests', TrackRequestKidneySchema);
