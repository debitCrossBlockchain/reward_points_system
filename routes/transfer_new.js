var hfc = require('hfc');
var chainUtil = require('../utils/chainUtil');
var async = require('async');
var crypto = require("hfc/lib/crypto");

module.exports = function (transfer) {
    /* GET transfer page. */
    transfer.route('/transfer').get(function (req, res) {
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
                var uname = req.session.user.name;
                Address.find({
                    user: uname
                },
                    function (err, doc) {
                        if (err || !doc) {
                            console.log("数据库操作失败");
                            res.render("transfer", {
                                user: req.session.user.name,
                                title: '积分转移',
                                addressList: []
                            }); //渲染assign页面
                        } else {
                            res.render("transfer", {
                                user: req.session.user.name,
                                title: '积分转移',
                                addressList: doc
                            }); //渲染assign页面
                        }
                    }).sort({ '_id': -1 });
            }
        }
    });
    transfer.route('/transfer').post(function (req, res) {
        console.log("************transfer*************");
        var Address = global.dbHandel.getModel('address');
        var uname = req.session.user.name;
        var token = req.session.user.token;
        var address = req.body.address;
        var asset = req.body.asset;
        var amount = req.body.amount;
        var target = req.body.target;
        var targetAsset = req.body.targetAsset;
        var rate = req.body.rate;
        var targetAddress = req.body.targetAddress;
        var ajaxResult = {
            code: 1,
            tips: ""
        };

        var argsRaw = [address, asset, amount, targetAddress, targetAsset, rate];
        var argsJson = JSON.stringify(argsRaw);
        console.log(argsRaw);

        async.waterfall([
            //校验接收人信息
            function (callback) {
                Address.findOne({
                    user: target,
                    address: targetAddress,
                    asset: targetAsset
                },
                function (err, doc) {
                    if (err) {
                        callback(err);
                    } else if (!doc) {
                        callback("no target");
                    } else {
                        callback(null, "verify ok");
                    }
                });
            },

            //读取公私钥
            function (arg, callback) {
                Address.findOne({
                    user: uname,
                    address: address,
                    asset: asset
                },
                function (err, doc) {
                    if (err) {
                        callback(err);
                    } else if (!doc) {
                        callback("no user address");
                    } else {
                        callback(null, doc.sk, doc.pk);
                    }
                });
            },

            //调用sdk
            function (arg1, arg2, callback) {
                var chain = chainUtil.getAssetChain("mychain");
                console.log("enrolling " + uname + "...");
                chain.enroll(uname, token, function (err, user) {
                    if (err) {
                        callback(err);
                    } else {
                        console.log("enroll " + uname + " ok");
                        user.getUserCert(null, function (err, userCert) {
                            if (err) {
                                callback(err);
                            } else {
                                //私钥对参数签名
                                var argsRaw = [userCert.encode().toString('base64'), address, asset, amount, targetAddress, targetAsset, rate];
                                var argsJson = JSON.stringify(argsRaw);
                                var cryptoPrimitives = new crypto.Crypto("SHA3", 256);
                                var signKey = cryptoPrimitives.ecdsaKeyFromPrivate(agr1, 'hex');
                                var argsBuffer = new Buffer(argsJson);
                                var sig = cryptoPrimitives.ecdsaSign(signKey, argsBuffer);

                                var req = {
                                    chaincodeID: global.CCID,
                                    fcn: "transfer",
                                    args: [userCert.encode().toString('base64'), address, asset, amount, targetAddress, targetAsset, rate],
                                    confidential: true,
                                    userCert: userCert
                                };
                                var tx = user.invoke(req);
                                tx.on('submitted', function (results) {
                                    console.log("transfer invoke complete: %j", results);
                                    // 更新tid对象置入model,记录交易信息
                                    var Tid = global.dbHandel.getModel('tid');
                                    Tid.create({
                                        "user": uname,
                                        "address": address,
                                        "tid": results.uuid,
                                        "tips": "积分转移",
                                        "time": new Date().toLocaleString()
                                    },
                                    function (err, result) {
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
                console.log("积分转移失败");
                console.log(err);
                ajaxResult.code = 201;
                ajaxResult.tips = "积分转移失败";
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