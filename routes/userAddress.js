var uuid = require('node-uuid');
var async = require('async');
var fs = require('fs');
var crypto = require('crypto')
var exec = require('child_process').exec;

module.exports = function (userAddress) {
    /* Get userAddress page.*/
    userAddress.route('/userAddress').get(function (req, res) {
        if (!req.session.user) { //到达/userAddress路径首先判断是否已经登录
            req.session.error = "请先登录";
            res.redirect("/login"); //未登录则重定向到 /login 路径
        } else {
            if (req.session.user.type != "3") {
                req.session.user = null;
                req.session.error = "请先登录";
                res.redirect("/login");
            } else {
                console.log("************query institution*************");
                var User = global.dbHandel.getModel('users');
                User.find({
                    type: "2"
                },
                function (err, doc) {
                    if (err || !doc) {
                        console.log("数据库操作失败");
                        res.render("userAddress", {
                            user: req.session.user.name,
                            title: '账户管理',
                            insList: []
                        }); //渲染assign页面
                    } else {
                        res.render("userAddress", {
                            user: req.session.user.name,
                            title: '账户管理',
                            insList: doc
                        }); //渲染assign页面
                    }
                }).sort({ '_id': -1 });
            }
        }
    });
    userAddress.route('/userAddress').post(function (req, res) {
        console.log("************apply for address*************");
        var uname = req.session.user.name;
        var ins = req.body.ins;
        var asset = req.body.asset;
        var ajaxResult = {
            code: 1,
            tips: ""
        };
        var filename = uuid.v4();
        var privateKeyFilename = filename + '.pem';
        var publickeyFilename = filename + '.pub';
        var opensslpemcmd = 'openssl genrsa  -out ' + privateKeyFilename + ' 1024';

        async.waterfall([
            //创建公私钥
            function (callback) {
                exec(opensslpemcmd, function (err, stdout, stderr) {
                    if (err) {
                        console.log('openssl error: ' + stderr);
                        callback('openssl error: ' + stderr);
                    }
                    else //执行openssl生成私钥文件成功，继续生成公钥文件
                    {
                        var opensslpubcmd = 'openssl rsa -in ' + privateKeyFilename + ' -pubout > ' + publickeyFilename;
                        exec(opensslpubcmd, function (err, stdout, stderr) {
                            if (err) {
                                console.log('openssl error: ' + stderr);
                                callback('openssl error: ' + stderr);
                            }
                            else //执行openssl生成公钥文件成功，删除文件
                            {
                                //输出公私钥
                                var privateKey = fs.readFileSync(process.cwd() + '/' + privateKeyFilename);
                                var publicKey = fs.readFileSync(process.cwd() + '/' + publickeyFilename);

                                //删除秘钥文件
                                exec("rm -rf " + privateKeyFilename + " " + publickeyFilename, function (err, stdout, stderr) {
                                    if (err) {
                                        console.log('rm error: ' + stderr);
                                        callback('openssl error: ' + stderr);
                                    }
                                    else {
                                        callback(null, privateKey, publicKey);
                                    }
                                });
                            }
                        });
                    }
                });
            },

            //存库   
            function (arg1, arg2, callback) {
                var sk = arg1.toString();
                var pk = arg2.toString();
                var shasum = crypto.createHash("md5");
                shasum.update(pk);
                var address = shasum.digest('hex');
                var Address = global.dbHandel.getModel('address');
                Address.create({
                    "user": uname,
                    "address": address,
                    "sk":sk,
                    "pk":pk,
                    "institution": ins,
                    "asset": asset,
                    "time": new Date().toLocaleString()
                },
                function (err, results) {
                    if (err) {
                        console.log(err);
                        callback(err);
                    } else {
                        callback(null,results);
                    }
                });
            }
        ], function (err, result) {
            if (err != null) {
                console.log("申请账户地址失败");
                console.log(err);
                ajaxResult.code = 201;
                ajaxResult.tips = "申请账户地址失败";
                ajaxResult = JSON.stringify(ajaxResult);
                res.json(ajaxResult);
                return;
            } else {
                ajaxResult.code = 200;
                ajaxResult = JSON.stringify(ajaxResult);
                res.json(ajaxResult);
                return;
            }
        });
    });
};