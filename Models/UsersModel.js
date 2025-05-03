const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  Name: String,
  Phone: String,
  MotherName: String,
  Email: String,
  DOC: {
    type: String,
    default: new Date()
  },
  DateOfCreation: {
    type: String,
    default: () => {
      const currentDate = new Date();
      const day = currentDate.getDate().toString().padStart(2, "0");
      const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
      const year = currentDate.getFullYear();
      return `${day}-${month}-${year}`;
    },
  }
});

const UserModel = mongoose.model("User", UserSchema);

module.exports = UserModel;
