var express = require('express');
var router = express.Router();
var user = require('../controllers/userController')

/* GET users listing. */
router.get('/sendCode', user.sendCode)

module.exports = router;
