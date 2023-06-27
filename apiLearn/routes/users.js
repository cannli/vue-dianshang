var express = require('express');
var router = express.Router();
let multer = require("multer");
var user = require('../controllers/userController')

let upload = multer({dest:'./public/uploads/'}).single("file");
/* GET users listing. */
router.post('/sendCode', user.sendCode)
router.post('/codePhoneLogin', user.codePhoneLogin)
router.post('/sendCoreCode', user.sendCoreCode)
router.post('/login', user.login)
router.post('/editUserInfo', user.editUserInfo)
router.post('/setPassword', user.setPassword)
router.post('/bindEmail', user.bindEmail)
router.post('/logout', user.logout)
router.post('/editUserImg',upload,user.editUserImg);
router.post('/uploadMoreImg',upload,user.editUserImg);
router.post('/setUserName',upload,user.setUserName);
module.exports = router;
