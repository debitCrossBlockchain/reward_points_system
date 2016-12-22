var hfc = require('hfc');
var chainUtil = require('../utils/chainUtil');
var async = require('async');

module.exports = function (register) {
    /* GET register page. */
    register.route("/register").get(function (req, res) { // 到达此路径则渲染register文件，并传出title值供 register.html使用
        console.log("************query institution*************");
        var User = global.dbHandel.getModel('users');
        User.find({
            type: "2"
        },
        function (err, doc) {
            if (err || !doc) {
                console.log("数据库操作失败");
                res.render("register", {
                    title: '用户注册',
                    institutionList: []
                }); //渲染register页面
            } else {
                res.render("register", {
                    title: '用户注册',
                    institutionList: doc
                }); //渲染register页面
            }
        }).sort({ '_id': -1 });
    });
    register.route("/register").post(function(req, res) {
        console.log("************register*************");
        var User = global.dbHandel.getModel('users');
        var uname = req.body.uname;
        var upwd = req.body.upwd;
        var iname = req.body.iname;
        var ajaxResult = {
            code: 1,
            tips: ""
        };

        //注册用户，将用户与所属机构绑定
        async.auto({
            //查询用户是否存在
            getUser: function (callback) {
                User.findOne({
                    type: "3",
                    name: uname
                },
                function (err, doc) {
                    if (err) {
                        callback(err);
                    } else if (doc) {
                        callback("existed");
                    } else {
                        callback(null, "getUser ok");
                    }
                });
            },
            //查询机构信息
            getIns: function (callback) {
                User.findOne({
                    type: "2",
                    name: iname
                },
                function (err, doc) {
                    if (err) {
                        callback(err);
                    } else if (!doc) {
                        callback("no institution");
                    } else {
                        callback(null, doc);
                    }
                });
            },
            //调用sdk
            callSDK: function (callback) {
                var chain = chainUtil.getAssetChain("mychain");
                chain.enroll("admin", "Xurw3yU9zI0l", function (err, admin) {
                    if (err) {
                        callback(err);
                    }else{
                        // Set this user as the chain's registrar which is authorized to register other users.
                        chain.setRegistrar(admin);
                        // registrationRequest
                        var registrationRequest = {
                            enrollmentID: uname,
                            affiliation: "yc"
                        };
                        chain.registerAndEnroll(registrationRequest, function (error, user) {
                            if (error) {
                                callback(error);
                            } else {
                                console.log("Enrolled %s successfully\n", uname);
                                var tokenOut = user.enrollmentSecret;
                                callback(null, tokenOut);
                            }
                        });
                    }
                });
            },
            //写库
            writeData: ['getUser', 'getIns', 'callSDK',
            function (arg, callback) {
                console.log("************write db*************");
                var token = arg.callSDK;
                var itoken = arg.getIns.token;
                var iaddress = arg.getIns.institutionAddress;
                User.create({
                    "type": "3",
                    "name": uname,
                    "password": upwd,
                    "token": token,
                    "institution": iname,
                    "institutionToken": itoken,
                    "institutionAddress": iaddress
                },
                function (err, result) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null, "writeData ok");
                    }
                });
            }]
        },
        function (err, results) {
            if (err != null) {
                console.log("用户注册失败");
                console.log(err);
                ajaxResult.code = 201;
                ajaxResult.tips = "用户注册失败";
                ajaxResult = JSON.stringify(ajaxResult);
                res.json(ajaxResult);
                return;
            } else {
                console.log(results);
                ajaxResult.code = 200;
                ajaxResult = JSON.stringify(ajaxResult);
                res.json(ajaxResult);
                return;
            }
        });
    });
};