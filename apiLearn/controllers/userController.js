const Core = require('@alicloud/pop-core')
const config = require('../util/aliconfig')
const dbConfig = require('../util/dbconfig');
let fs = require('fs');
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
    res.send({
        code: 200,
        data: code,
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
                msg: '登录成功',
                data: user[0]
            })
            validatePhoneCode.push({
                phone,
                code,
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
//获取用户信息
let getUser = (username) => {
    let sql = `select * from user where id=? or phone=? or username=?`;
    let sqlArr = [username, username, username];
    return dbConfig.SySqlConnect(sql, sqlArr);
}
//获取注册用户的详情
let getUserInfo = (user_id) => {
    let sql = `select age,sex,job,path,birthday from userinfo where user_id=?`;
    let sqlArr = [user_id];
    return dbConfig.SySqlConnect(sql, sqlArr);
}
//用户注册
let regUser = async (phone) => {
    //检测用户是否第一次注册
    let userpic = 'http://himg.bdimg.com/sys/portrait/item/95fde99d96e584bf32303036c700.jpg';
    let sql = `insert into user(username,userpic,phone,create_time) value(?,?,?,?)`;
    let sqlArr = [phone, userpic, phone, (new Date().valueOf())];
    let res = await dbConfig.SySqlConnect(sql, sqlArr);
    console.log(res, 33333)
    if (res.affectedRows == 1) {//执行成功
        //执行成功，获取用户信息
        //获取用户信息方法
        let user = await getUser(phone);
        console.log(user, 6666666)
        //绑定用户副表
        let userinfo = await createUserInfo(user[0].id);
        if (userinfo.affectedRows == 1) {
            return user;
        } else {
            return false;
        }
    } else {

    }
}
//创建副表
let createUserInfo = (user_id) => {
    let sql = `insert into userinfo(user_id,age,sex,job) values(?,?,?,?)`;
    let sqlArr = [user_id, 18, 2, '未设置'];
    return dbConfig.SySqlConnect(sql, sqlArr);
}
// 检测验证码登录是否是第一次登录
let phoneLoginBind = async (phone) => {
    let sql = 'select * from user where username=? or phone=?';
    let sqlArr = [phone, phone];
    let res = await dbConfig.SySqlConnect(sql, sqlArr);
    if (res.length) {
        res[0].userinfo = await getUserInfo(res[0].id);
        return res;
    } else {
        //用户第一次注册，绑定表
        let res = await regUser(phone);
        //获取用户的信息详情
        res[0].userinfo = await getUserInfo(res[0].id);
        return res;
        //用户注册

        //获取用户详情
    }
}
//用户名、手机号登录,手机号+密码，邮箱+密码，用户名+密码
let login = (req, res) => {
    let username = req.query.username,
        password = req.query.password;
    let phone = /^1\d{10}$/;
    let email = /^([a-zA-Z0-9_-])+@([a-zA-Z0-9_-])+((\.[a-zA-Z0-9_-]{2,3}){1,2})$/;
    if (phone.test(username)) {
        let sql = 'select * from user where phone=? and password=? or username=? and password=?';
        let sqlArr = [username, password, username, password];
        let callBack = async (err, data) => {
            if (err) {
                console.log(err);
                res.send({
                    code: 400,
                    msg: '出错了'
                });
            } else if (data == '') {
                res.send({
                    code: 400,
                    msg: '用户名或者密码出错！'
                });
            } else {
                let user_id = data[0].id;
                let result = await getUserInfo(user_id);
                data[0].userinfo = result[0];
                res.send({
                    code: 200,
                    msg: '登录成功',
                    data: data[0]
                });
            }
        }
        dbConfig.sqlConnect(sql, sqlArr, callBack);
    } else if (email.test(username)) {
        let sql = `select * from user where email=? and password=?`;
        let sqlArr = [username, password];
        let callBack = async (err, data) => {
            if (err) {
                console.log(err);
                res.send({
                    code: 400,
                    msg: '出错了'
                });
            } else if (data == '') {
                res.send({
                    code: 400,
                    msg: '用户名或者密码出错！'
                });
            } else {
                let user_id = data[0].id;
                let result = await getUserInfo(user_id);
                data[0].userinfo = result[0];
                res.send({
                    code: 200,
                    msg: '登录成功',
                    data: data[0]
                });
            }
        }
        dbConfig.sqlConnect(sql, sqlArr, callBack);
    } else {
        let sql = `select * from user where username=? and password=?`;
        let sqlArr = [username, password];
        let callBack = async (err, data) => {
            if (err) {
                console.log(err);
                res.send({
                    code: 400,
                    msg: '出错了'
                });
            } else if (data == '') {
                res.send({
                    code: 400,
                    msg: '用户名或者密码出错！'
                });
            } else {
                let user_id = data[0].id;
                let result = await getUserInfo(user_id);
                data[0].userinfo = result[0];
                res.send({
                    code: 200,
                    msg: '登录成功',
                    data: data[0]
                });
            }
        }
        dbConfig.sqlConnect(sql, sqlArr, callBack);
    }
}
//查看用户是否有详情信息
let finUserInfo = async (user_id) => {
    let sql = `select * from userinfo where user_id=?`;
    let sqlArr = [user_id];
    let res = await dbConfig.SySqlConnect(sql, sqlArr);
    if (res.length) {
        return true;
    }
    return false;
}
//修改用户详细信息
let setUserInfo = async (user_id, age, sex, job, path, birthday) => {
    if (finUserInfo(user_id)) {
        let sql = `update userinfo  set age=?,sex=?,job=?,path=?,birthday=? where user_id=? `;
        let sqlArr = [age, sex, job, path, birthday, user_id]
        let res = await dbConfig.SySqlConnect(sql, sqlArr);
        if (res.affectedRows == 1) {
            let user = await getUser(user_id);
            let userinfo = await getUserInfo(user_id);
            user[0].userinfo = userinfo[0];
            return user;
        }
    } else {
        let sql = `insert into userinfo (user_id,age,sex,job,path,birthday) values(?,?,?,?,?,?)`;
        let sqlArr = [user_id, age, sex, job, path, birthday];
        let res = await dbConfig.SySqlConnect(sql, sqlArr);
        if (res.affectedRows == 1) {
            let user = await getUser(user_id);
            let userinfo = await getUserInfo(user_id);
            user[0].userinfo = userinfo[0];
            return user;
        }
    }
}
//修改用户名称
let setUserName = async (user_id, username) => {
    let sql = `update user set username=? where id=?`;
    let sqlArr = [username, user_id];
    let res = await dbConfig.SySqlConnect(sql, sqlArr);
    if (res.affectedRows == 1) {
        return true;
    } else {
        return false;
    }
}
//修改资料
let editUserInfo = async (req, res) => {
    let {user_id, username, age, sex, job, path, birthday} = req.query;
    let result = await setUserName(user_id, username);
    if (result) {
        let data = await setUserInfo(user_id, age, sex, job, path, birthday);
        if (data.length) {
            res.send({
                code: 200,
                data: data[0]
            })
        } else {
            res.send({
                code: 400,
                msg: '修改失败'
            })
        }
    } else {
        res.send({
            code: 400,
            msg: '修改失败'
        })
    }
}

//检查用户密码
let checkUserPwd = async (user_id) => {
    let sql = `select password from user where id=?`;
    let sqlArr = [user_id];
    let res = await dbConfig.SySqlConnect(sql, sqlArr);
    console.log(res[0].password)
    if (res.length) {
        return res[0].password;
    } else {
        return 0;
    }
}
//修改用户密码
let setPassword = async (req, res) => {
    let {user_id, oldpassword, newpassword} = req.query;
    let userPwd = await checkUserPwd(user_id);
    if (userPwd) {
        console.log(userPwd, oldpassword)
        if (userPwd == oldpassword) {
            let sql = `update user set password=? where id=?`;
            let sqlArr = [newpassword, user_id];
            let result = await dbConfig.SySqlConnect(sql, sqlArr);
            if (result.affectedRows) {
                res.send({
                    code: 200,
                    msg: '修改密码成功！'
                })
            } else {
                res.send({
                    code: 400,
                    msg: '修改密码失败！'
                })
            }
        } else {
            res.send({
                code: 400,
                msg: '原密码输入错误！'
            })
        }
    } else {
        let sql = `update user set password=? where id=?`;
        let sqlArr = [newpassword, user_id];
        let result = await dbConfig.SySqlConnect(sql, sqlArr);
        if (result.affectedRows) {
            res.send({
                code: 200,
                msg: '修改密码成功！'
            })
        } else {
            res.send({
                code: 400,
                msg: '修改密码失败！'
            })
        }
    }
}
//绑定用户邮箱接口
let bindEmail = async (req, res) => {
    let {user_id, email} = req.query;
    let sql = `update user set email=? where id=?`;
    let sqlArr = [email, user_id];
    let result = await dbConfig.SySqlConnect(sql, sqlArr);
    console.log(result);
    if (result.affectedRows == 1) {
        res.send({
            code: 200,
            msg: '邮箱绑定成功'
        })
    } else {
        res.send({
            code: 400,
            msg: '邮箱绑定失败'
        })
    }
}

//退出
let logout = (req, res) => {
    res.send({
        code: 200,
        msg: '退出登录'
    })
}

//图片上传
let editUserImg = (req, res) => {
    if (req.file.length === 0) {
        res.render('error', {message: '上传文件不能为空！'});
    } else {
        let file = req.file;
        console.log(file);
        fs.renameSync('./public/uploads/' + file.filename, './public/uploads/' + file.originalname);
        res.set({
            'content-type': 'application/JSON; charset=utf-8'
        })
        let {user_id} = req.query;
        let imgUrl = 'http://localhost:3000/public/uploads/' + file.originalname;
        let sql = `update user set userpic=? where id=?`;
        let sqlArr = [imgUrl, user_id];
        dbConfig.sqlConnect(sql, sqlArr, (err, data) => {
            if (err) {
                console.log(err);
                throw '出错了';
            } else {
                if (data.affectedRows == 1) {
                    res.send({
                        code: 200,
                        msg: '修改成功',
                        url: imgUrl
                    })
                } else {
                    res.send({
                        code: 400,
                        msg: '修改失败'
                    })
                }
            }
        })
    }

}

//批量多图上传
let uploadMoreImg = (req, res) => {
    console.log('------------------------')
    if (req.files.length === 0) {
        res.render('error', {message: '上传文件不能为空！'});
    } else {
        let sql = `insert into image (url,create_time,user_id) values `;
        let sqlArr = [];
        for (var i in req.files) {
            res.set({
                'content-type': 'application/json; charset=utf8'
            });
            let file = req.files[i];
            fs.renameSync('./public/uploads/' + file.filename, './public/uploads/' + file.originalname);
            let {user_id} = req.query;
            let url = 'http://localhost:3000/uploads/' + file.originalname;
            if (req.files.length - 1 == i) {
                sql += '(?)'
            } else {
                sql += '(?),'
            }
            console.log(sql);
            sqlArr.push([url, (new Date().valueOf()), user_id])
        }
        //批量存储到数据库
        dbConfig.sqlConnect(sql, sqlArr, (err, data) => {
            if (err) {
                console.log(err);
            } else {
                console.log(data.affectedRows);
                if (data.affectedRows > 0) {
                    res.send({
                        code: 200,
                        affectedRows: data.affectedRows,
                        msg: '上传成功'
                    });
                } else {
                    res.send({
                        code: 400,
                        msg: '上传失败'
                    });
                }
            }
        })
    }
}
module.exports = {
    sendCode,
    codePhoneLogin,
    sendCoreCode,
    login,
    editUserInfo,
    setPassword,
    bindEmail,
    logout,
    editUserImg,
    uploadMoreImg,
    setUserName
}
