const mongoose = require("mongoose");

//Configure database connection with mongodb atlas...
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log(`MothersDay-Processing Backend Successfully Connected to Mongodb Atlas Database...`.bgYellow.black);
    } catch (err) {
        console.log(`Mongo server ${err}`.bgRed.white);
        console.log(`MothersDay-SERVER Failed to connect to Database...`.bgRed.black);

    }
}
module.exports = connectDB;