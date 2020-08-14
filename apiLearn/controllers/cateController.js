var dbConfig = require('../util/dbconfig')
//获取分类
getCate = (req, res) => {
    var sql = "select id, category from cate"
    var sqlArr = []
    var callBack = (err, data) => {
        if (err) {
            console.log('链接失败')
            console.log(err,8888)
        } else {
            res.send({
                'list': data
            })
        }
    }
    dbConfig.sqlConnect(sql, sqlArr,callBack)
}


// 获取指定分类的文章列表
getPostCate = (req, res) => {
    let {id} = req.query
    const sql = `select * from post where cate_id=?`
    const sqlArr = [id]
    const callBack = (err, data)=>{
        if (err) {
            console.log('链接失败')
            console.log(err,8888)
        } else {
            res.send({
                'list': data
            })
        }
    }
    dbConfig.sqlConnect(sql, sqlArr,callBack)
}
module.exports = {getCate, getPostCate}
