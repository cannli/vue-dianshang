const Core = require('@alicloud/pop-core')
const config = require('../util/aliconfig')
const dbConfig = require('../util/dbconfig');
// 配置
let client = new Core(config.alicloud)
const requestOption = {
    method: 'POST'
};

function rand(min, max) {
    return Math.floor(Math.random() * (max - min)) + min
}

validatePhoneCode = []

let sendCodeP = (phone) => {
    for (const x of validatePhoneCode) {
        if (x.phone === phone) {
            return true
        }
    }
    return false
}

let findCodeAndPhone = (phone, code) => {
    for (const x of validatePhoneCode) {
        if (x.phone == phone && x.code == code) {
            return 'login'
        }
    }
    return 'error'
}

// 模拟验证码发送接口
sendCode = (req, res) => {
    let phone = req.query.phone;
    let code = rand(1000, 9999)
    if (sendCodeP(phone)) {
        res.send({
            code: 400,
            msg: '已经发送过验证码，稍后再发~'
        })
    }
    validatePhoneCode.push({
        phone,
        code
    })
    console.log(validatePhoneCode, 7777)
    res.send({
        code: 200,
        msg: '发送成功'
    })
    console.log(code)
}

// 验证码登录接口
codePhoneLogin = async (req, res) => {
    let {phone, code} = req.query
    // 该手机号是否发送过验证码
    if (sendCodeP(phone)) {
        // 验证码跟code是否匹配
        let status = findCodeAndPhone(phone, code)
        if (status === 'login') {
            // 登录成功后的操作
            let user = await phoneLoginBind(phone, code)
            res.send({
                code: 200,
                msg: '登录成功'
            })
            validatePhoneCode.push({
                phone,
                code,
                data:user[0]
            })
        } else if (status === 'error') {
            res.send({
                code: 200,
                msg: '登录失败'
            })
        }
    } else {
        res.send({
            code: 400,
            msg: '发送验证码'
        })
    }
}

// 阿里云 真实 短信 获取验证码
sendCoreCode = (req, res) => {
    let phone = res.query.phone
    let code = rand(1000, 9999)
    let params = {
        "RegionId": "cn-hangzhou",
        "PhoneNumbers": "17620317584",
        "SignName": "变美app",
        "TemplateCode": "SMS_185232768",
        "TemplateParam": JSON.stringify({code})
    }
    client.request('SendSms', params, requestOption).then((result) => {
        console.log(result, 77777);
        if (result.Code == 'OK') {
            res.send({
                code: 200,
                msg: '发送成功'
            })
        } else {
            res.send({
                code: 400,
                msg: '发送失败'
            })
        }
    }, (ex) => {
        console.log(ex);
    })
}

// 检测验证码登录是否是第一次登录
let phoneLoginBind = async (phone)=>{
    let sql = 'select * from user where username=? or phone=?';
    let sqlArr = [phone,phone];
    let res = await dbConfig.SySqlConnect(sql,sqlArr);
    if(res.length){
        res[0].userinfo = await getUserInfo(res[0].id);
        return res;
    }else{
        //用户第一次注册，绑定表
        let res = await regUser(phone);
        //获取用户的信息详情
        res[0].userinfo = await getUserInfo(res[0].id);
        return res;
        //用户注册

        //获取用户详情
    }
}

//用户注册
let regUser = async (phone)=>{
    //检测用户是否第一次注册
    let userpic = 'http://himg.bdimg.com/sys/portrait/item/95fde99d96e584bf32303036c700.jpg';
    let sql = `insert into user(username,userpic,phone,create_time) value(?,?,?,?)`;
    let sqlArr = [phone,userpic,phone,(new Date().valueOf())];
    let res = await dbConfig.SySqlConnect(sql,sqlArr);
    console.log(res,33333)
    if(res.affectedRows == 1){//执行成功
        //执行成功，获取用户信息
        //获取用户信息方法
        let user = await getUser(phone);
        console.log(user,6666666)
        //绑定用户副表
        let userinfo =  await createUserInfo(user[0].id);
        if(userinfo.affectedRows == 1 ){
            return user;
        }else{
            return false;
        }
    }else{

    }
}

//获取用户信息
let getUser = (username)=>{
    let sql = `select * from user where id=? or phone=? or username=?`;
    let sqlArr = [username,username,username];
    return dbConfig.SySqlConnect(sql,sqlArr);
}

//获取注册用户的详情
let getUserInfo = (user_id)=>{
    let sql = `select age,sex,job,path,birthday from userinfo where user_id=?`;
    let sqlArr = [user_id];
    return dbConfig.SySqlConnect(sql,sqlArr);
}

//创建副表
let createUserInfo = (user_id)=>{
    let sql = `insert into userinfo(user_id,age,sex,job) values(?,?,?,?)`;
    let sqlArr =  [user_id,18,2,'未设置'];
    return dbConfig.SySqlConnect(sql,sqlArr);
}
module.exports = {
    sendCode,
    codePhoneLogin,
    sendCoreCode
}
