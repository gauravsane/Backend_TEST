const mongoose = require("mongoose");


const AdminSchema = new mongoose.Schema({
    AdminId: String,
    AdminName: String,
    Password: String,
    role: String,
    CompanyName: String
});

const AdminModel = mongoose.model("Admin",AdminSchema);

module.exports = AdminModel;