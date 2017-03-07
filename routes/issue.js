var hfc = require('hfc');
var chainUtil = require('../utils/chainUtil');
var async = require('async');

module.exports = function (issue) {
    issue.route('/issue').get(function (req, res) {
        if (!req.session.user) { //到达路径首先判断是否已经登录
            req.session.error = "请先登录";
            res.redirect("/login"); //未登录则重定向到 /admin 路径
        } else {
            if (req.session.user.type != "2") {
                req.session.user = null;
                req.session.error = "请先登录";
                res.redirect("/login");
            } else {
                res.render("issue", {
                    user: req.session.user.name,
                    title: '积分发行'
                }); //已登录则渲染页面
            }
        }
    });
    issue.route('/issue').post(function (req, res) {
        var Asset = global.dbHandel.getModel('asset');
        var iname = req.session.user.name;
        var itoken = req.session.user.token;
        var address = req.session.user.institutionAddress;
        var assetName = req.body.assetName;
        var amount = req.body.amount;
        var rate = req.body.rate;
        var ajaxResult = {
            code: 1,
            tips: ""
        };
        
        async.auto({
            //查询资产 
            getAsset: function (callback) {
                Asset.findOne({
                    asset: assetName
                },
                function (err, doc) {
                    if (err) {
                        callback(err);
                    } else if (doc) {
                        if (doc.institution != iname) {
                            //callback("repeating asset");
                            callback(null, "insert");
                        } else {
                            callback(null, "update");
                        }
                    } else {
                        callback(null, "insert");
                    }
                });
            },
            //调用sdk
            callSDK: ['getAsset',
            function (arg, callback) {
                var op = arg.getAsset;
                console.log(op);
                var chain = chainUtil.getAssetChain("mychain");
                console.log("enrolling " + iname + "...");
                chain.enroll(iname, itoken, function (err, admin) {
                    if (err) {
                        callback(err);
                    }else{
                        console.log("enroll " + iname + " ok");
                        admin.getUserCert(null, function (err, adminCert) {
                            if (err) {
                                return callback(err);
                            }
                            var req = {
                                chaincodeID: global.CCID,
                                fcn: "issueCoin",
                                args: [adminCert.encode().toString('base64'), address, assetName, amount],
                                confidential: true,
                                userCert: adminCert
                            };
                            console.log("issueCoin: invoking...");
                            var tx = admin.invoke(req);
                            tx.on('submitted', function (results) {
                                console.log("issue invoke complete: %j", results);
                                var Tid = global.dbHandel.getModel('tid');
                                Tid.create({
                                    "user": iname,
                                    "address": address,
                                    "tid": results.uuid,
                                    "tips": "积分发行",
                                    "time": new Date().toLocaleString()
                                },
                                function (err, result) {
                                    if (err) {
                                        callback(err);
                                    } else {
                                        callback(null, op);
                                    }
                                });
                            });
                            tx.on('error', function (err) {
                                callback(err);              
                            });
                        });
                    }
                });
            }],
            //更新或插入数据
            operateData: ['callSDK',
            function (arg, callback) {
                var op = arg.callSDK;
                if (op === "update") {
                    console.log("************update asset*************");
                    var conditions = { institution: iname, asset: assetName };
                    var update = { $set: { rate: rate } };
                    var options = { upsert: false };
                    Asset.update(conditions, update, options,
                    function (err) {
                        if (err) {
                            callback(err);
                        } else {
                            callback(null, "update asset ok");
                        }
                    });
                } else {
                    console.log("************insert asset*************");
                    Asset.create({
                        "institution": iname,
                        "asset": assetName,
                        "rate": rate,
                        "time": new Date().toLocaleString()
                    },
                    function (err, results) {
                        if (err) {
                            callback(err);
                        } else {
                            callback(null, "insert asset ok");
                        }
                    });
                }
            }]
        }, 
        function (err, result) {
            if (err != null) {
                console.log("积分发行失败");
                console.log(err);
                ajaxResult.code = 201;
                ajaxResult.tips = "积分发行失败";
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