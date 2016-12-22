var hfc = require('hfc');
var chainUtil = require('../utils/chainUtil');
var async = require('async');

module.exports = function (issue) {
    issue.route('/issue').get(function (req, res) {
        if (!req.session.user) { //到达路径首先判断是否已经登录
            req.session.error = "请先登录";
            res.redirect("/admin"); //未登录则重定向到 /admin 路径
        } else {
            if (req.session.user.type != "1" && req.session.user.type != "2") {
                req.session.user = null;
                req.session.error = "请先登录";
                res.redirect("/admin");
            } else {
                console.log("************query institution*************");
                var User = global.dbHandel.getModel('users');
                User.find({
                    type: "2"
                },
                function (err, doc) {
                    if (err || !doc) {
                        console.log("数据库操作失败");
                        res.render("issue", {
                            user: req.session.user.name,
                            title: '资产发行',
                            institutionList: []
                        }); //渲染issue页面
                    } else {
                        res.render("issue", {
                            user: req.session.user.name,
                            title: '资产发行',
                            institutionList: doc
                        }); //渲染issue页面
                    }
                }).sort({ '_id': -1 });
            }
        }
    });
    issue.route('/issue').post(function (req, res) {
        var User = global.dbHandel.getModel('users');
        var Asset = global.dbHandel.getModel('asset');
        var uname = req.body.institution;
        var assetName = req.body.assetName;
        var amount = req.body.amount;
        var expire = req.body.expire;
        var aname = req.session.user.name;
        var atoken = req.session.user.token;
        var address = "";
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
                        if (doc.institution != uname) {
                            callback("repeating asset");
                        } else {
                            callback(null, "update");
                        }
                    } else {
                        callback(null, "insert");
                    }
                });
            },
            //查询机构信息  
            getIns: function (callback) {
                User.findOne({
                    name: uname
                },
                function (err, doc) {
                    if (err) {
                        callback(err);
                    } else if (!doc) {
                        callback("no institution");
                    }
                    else {
                        var addressOut = doc.institutionAddress;
                        callback(null, addressOut);
                    }
                });
            },
            //调用sdk
            callSDK: ['getAsset', 'getIns',
            function (arg, callback) {
                address = arg.getIns;
                var op = arg.getAsset;
                var chain = chainUtil.getAssetChain("mychain");
                console.log("enrolling " + aname + "...");
                chain.enroll(aname, atoken, function (err, admin) {
                    if (err) {
                        callback(err);
                    }else{
                        console.log("enroll " + aname + " ok");
                        admin.getUserCert(null, function (err, adminCert) {
                            if (err) {
                                callback(err);
                            }
                            var req = {
                                chaincodeID: "f23b78574abebbbe42ddf37326a4acd9a33e38e1fc3f0ae54615609181445aa0",
                                fcn: "issue",
                                args: [address, assetName, amount],
                                confidential: true,
                                userCert: adminCert,
                                attrs: ['role']
                            };
                            console.log("issue: invoking...");
                            var tx = admin.invoke(req);
                            tx.on('submitted', function (results) {
                                console.log("issue invoke submitted: %j", results);
                            });
                            tx.on('complete', function (results) {
                                console.log("issue invoke complete: %j", results);
                                callback(null, op);
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
                op = arg.callSDK;
                if (op === "update") {
                    console.log("************update asset*************");
                    var conditions = { institution: uname, asset: assetName };
                    var update = { $set: { expire: expire } };
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
                        "institution": uname,
                        "asset": assetName,
                        "expire": expire
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
                console.log("发行资产失败");
                console.log(err);
                ajaxResult.code = 201;
                ajaxResult.tips = "发行资产失败";
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