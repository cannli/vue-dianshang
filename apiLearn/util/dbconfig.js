const mysql = require('mysql')

module.exports  = {
    // 数据库配置
    config: {
        host: 'localhost',
        port: '3306',
        user: 'exapp',
        password: '123456',
        database: 'exapp'
    },

    // 链接数据库，是用MySQL的连接数据库连接方式
    // 连接池数据
    sqlConnect:function (sql, sqlArr, callBack) {
        const pool = mysql.createPool(this.config)
        pool.getConnection((err, conn) => {
            console.log(123456)
            if (err){
                console.log('连接失败1');
                return
            }

            // 事件驱动回调
            conn.query(sql, sqlArr, callBack);
            // 释放连接
            conn.release()
        })
    },

    //promise 回调
    SySqlConnect:function(sySql,sqlArr){
        return new Promise((resolve,reject)=>{
            var pool = mysql.createPool(this.config);
            pool.getConnection(function(err,conn){
                console.log('123');
                if(err){
                    reject(err);
                }else{
                    conn.query(sySql,sqlArr,(err,data)=>{
                        if(err){
                            reject(err)
                        }else{
                            resolve(data);
                        }
                        conn.release();
                    });
                }

            })
        }).catch((err)=>{
            console.log(err);
        })
    }
}
