var hfc = require('hfc');
var chainUtil = require('../utils/chainUtil');
var async = require('async');

module.exports = function(transfer) {
    /* GET transfer page. */
    transfer.route('/transfer').get(function(req, res) {
        if (!req.session.user) { //到达路径首先判断是否已经登录
            req.session.error = "请先登录";
            res.redirect("/login"); //未登录则重定向到 /login 路径
        } else {
            if (req.session.user.type != "3") {
                req.session.user = null;
                req.session.error = "请先登录";
                res.redirect("/login");
            } else {
                console.log("************query address*************");
                var Address = global.dbHandel.getModel('address');
                var Asset = global.dbHandel.getModel('asset');
                var uname = req.session.user.name;
                var iname = req.session.user.institution;                

                async.parallel([
                    function (callback) {
                        Address.find({
                            user: uname
                        },
                        function (err, doc) {
                            if (err) {
                                callback(err);
                            } else if (!doc) {
                                callback("no address");
                            }
                            else {
                                callback(null, doc);
                            }
                        }).sort({ '_id': -1 });
                    },
                    function (callback) {
                        Asset.find({
                            institution: iname
                        },
                        function (err, doc) {
                            if (err) {
                                callback(err);
                            } else if (!doc) {
                                callback("no asset");
                            }
                            else {
                                callback(null, doc);
                            }
                        }).sort({ '_id': -1 });
                    }
                ], function (err, result) {
                    if (err != null) {
                        console.log("数据库操作失败");
                        res.render("transfer", {
                            user: req.session.user.name,
                            title: '资产转移',
                            assetList: [],
                            addressList: []
                        }); //渲染transfer页面
                    } else {
                        res.render("transfer", {
                            user: req.session.user.name,
                            title: '资产转移',
                            assetList: result[1],
                            addressList: result[0]
                        }); //渲染transfer页面
                    }
                });
            }
        }
    });
    transfer.route('/transfer').post(function(req, res) {
        console.log("************transfer*************");
        var User = global.dbHandel.getModel('users');
        var uname = req.session.user.name;
        var token = req.session.user.token;
        var iname = req.session.user.institution;
        var address = req.body.address;
        var target = req.body.target;
        var targetAddress = req.body.targetAddress;
        var amount = req.body.amount;
        var asset = req.body.asset;
        var ajaxResult = {
            code: 1,
            tips: ""
        };        

        async.series([
            //校验接收人信息
            function (callback) {
                User.findOne({
                    type: "3",
                    name: target
                },
                function (err, doc) {
                    if (err) {
                        callback(err);
                    } else if (!doc) {
                        callback("no target");
                    }
                    else {
                        if (doc.institution != iname) {
                            callback("incorrect institution");
                        }
                        else {
                            callback(null, "verify ok");
                        }
                    }
                });
            },
            //调用sdk
            function (callback) {
                var chain = chainUtil.getAssetChain("mychain");
                console.log("enrolling " + uname + "...");
                chain.enroll(uname, token, function(err, user) {
                    if (err) {
                        callback(err);
                    }else{
                        console.log("enroll " + uname + " ok");
                        user.getUserCert(null, function (err, userCert) {
                            if (err) {
                                callback(err);
                            }else{
                                var req = {
                                    chaincodeID: "f23b78574abebbbe42ddf37326a4acd9a33e38e1fc3f0ae54615609181445aa0",
                                    fcn: "transfer",
                                    args: [userCert.encode().toString('base64'), address, asset, amount, targetAddress],
                                    confidential: true,
                                    userCert: userCert
                                };
                                var tx = user.invoke(req);
                                var txid;
                                tx.on('submitted', function (results) {
                                    txid = results.uuid;
                                });
                                tx.on('complete', function (results) {
                                    console.log("transfer invoke complete: %j", results);
                                    // 更新tid对象置入model,记录交易信息
                                    var Tid = global.dbHandel.getModel('tid');
                                    Tid.create({
                                            "user": uname,
                                            "address": address,
                                            "tid": txid,
                                            "tips": "资产转移",
                                            "time": new Date().toLocaleString()
                                        },
                                        function(err, result) {
                                            if (err) {
                                                callback(err);
                                            } else {
                                                callback(null, result);
                                            }
                                        });
                                });
                                tx.on('error', function (err) {
                                    callback(err);
                                });
                            }
                        });
                    }
                });
            }
        ], function (err, result) {
            if (err != null) {
                console.log("转移资产失败");
                console.log(err);
                ajaxResult.code = 201;
                ajaxResult.tips = "转移资产失败";
                ajaxResult = JSON.stringify(ajaxResult);
                res.json(ajaxResult);
                return;
            } else {
                console.log(result);
                ajaxResult.code = 200;
                ajaxResult = JSON.stringify(ajaxResult);
                res.json(ajaxResult);
                return;
            }
        });
    });
};