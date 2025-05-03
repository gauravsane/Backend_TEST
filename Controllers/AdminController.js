const AdminModel = require("../Models/AdminModel");
const UserModel = require("../Models/UsersModel");

const createAdmin = async (req, res) => {
  try {
    const { AdminId, AdminName, role, CompanyName, Password } = req.body;
    if (!AdminId || !AdminName || !role || !CompanyName) {
      return res.status(404).json({
        success: false,
        message: "Please fill all the details",
      });
    }
    const AdminExists = await AdminModel.findOne({ AdminName: AdminName });

    if (AdminExists) {
      return res.status(403).json({
        success: false,
        message: "Admin Already Registered",
      });
    }
    const AdminData = await AdminModel.create({
      AdminId,
      AdminName,
      role,
      CompanyName,
      Password,
    });
    await AdminData.save();
    return res.status(200).json({
      success: true,
      message: "Admin Created Success",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const adminLogin = async (req, res) => {
  try {
    const { AdminId, Password } = req.body;
    if (!AdminId || !Password) {
      return res.status(404).json({
        success: false,
        message: "Please Fill all the Data",
      });
    }
    const checkAdmin = await AdminModel.findOne({ AdminId: AdminId });
    if (checkAdmin && checkAdmin.Password === Password) {
      return res.status(200).json({
        success: true,
        message: "Login Success",
        data: checkAdmin,
      });
    } else {
      return res.status(405).json({
        success: false,
        message: "Invalid Credentials",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const getAllUserData = async (req, res) => {
  try {
    const Id = req.params.adminId;
    const AdminExists = await AdminModel.findById(Id);
    if(!AdminExists){
        return res.status(404).json({
            success: false,
            message: "Admin Not Found"
        })
    }
    const UserData = await UserModel.find({});
    return res.status(200).json({
        success: true,
        message: "Data Fetch Success",
        data: UserData
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  createAdmin,
  adminLogin,
  getAllUserData
};
