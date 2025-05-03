const express = require("express");
const { createAdmin,adminLogin,getAllUserData } = require("../Controllers/AdminController");

const router = express.Router();


router.post("/createAdmin",createAdmin);

router.post("/login-admin",adminLogin);

router.get("/allUserData/:adminId",getAllUserData);





module.exports = router;