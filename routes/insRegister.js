var hfc = require('hfc');
var chainUtil = require('../utils/chainUtil');
var uuid = require('node-uuid');
var async = require('async');

module.exports = function (insRegister) {
    /* GET insRegister page. */
    insRegister.route("/insRegister").get(function (req, res) {
        if (!req.session.user) {
            req.session.error = "请先登录";
            res.redirect("/admin");
        } else {
            if (req.session.user.type != "1") {
                req.session.user = null;
                req.session.error = "请先登录";
                res.redirect("/admin");
            } else {
                res.render("insRegister", {
                    user: req.session.user.name,
                    title: '机构注册'
                });
            }
        }
    });
    insRegister.route("/insRegister").post(function (req, res) {
        var User = global.dbHandel.getModel('users');
        var uname = req.body.uname;
        var upwd = req.body.upwd;
        var aname = req.session.user.name;
        var atoken = req.session.user.token;
        var ajaxResult = {
            code: 1,
            tips: ""
        };

        async.auto({
            //查询机构是否存在
            getData: function (callback) {
                User.findOne({
                    name: uname
                },
                function (err, doc) {
                    if (err) {
                        callback(err);
                    } else if (doc) {
                        callback("existed");
                    } else {
                        callback(null, "getData ok");
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
                                var token = user.enrollmentSecret;
                                callback(null, token);
                            }
                        });
                    }
                });
            },
            //写库
            writeData: ['getData', 'callSDK',
            function (arg, callback) {
                console.log("************write db*************");
                User.create({
                    "type": "2",
                    "name": uname,
                    "password": upwd,
                    "token": arg.callSDK,
                    "institution": aname,
                    "institutionToken": atoken,
                    "institutionAddress": uuid.v4()
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
                console.log("机构注册失败");
                console.log(err);
                ajaxResult.code = 201;
                ajaxResult.tips = "机构注册失败";
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