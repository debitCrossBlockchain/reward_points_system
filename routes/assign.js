var hfc = require('hfc');
var chainUtil = require('../utils/chainUtil');
var async = require('async');

module.exports = function (assign) {
    /* GET assign page. */
    assign.route('/assign').get(function(req, res) {
        if (!req.session.user) { //到达路径首先判断是否已经登录
            req.session.error = "请先登录";
            res.redirect("/login"); //未登录则重定向到 /login 路径
        } else {
            if (req.session.user.type != "2") {
                req.session.user = null;
                req.session.error = "请先登录";
                res.redirect("/login");
            } else {
                console.log("************query asset*************");
                var Asset = global.dbHandel.getModel('asset');                
                var iname = req.session.user.name;
                Asset.find({
                    institution: iname
                },
                function (err, doc) {
                    if (err || !doc) {
                        console.log("数据库操作失败");
                        res.render("assign", {
                            user: req.session.user.name,
                            title: '积分发放',
                            assetList: []
                        }); //渲染assign页面
                    } else {
                        res.render("assign", {
                            user: req.session.user.name,
                            title: '积分发放',
                            assetList: doc
                        }); //渲染assign页面
                    }
                }).sort({ '_id': -1 });
            }
        }
    });
    assign.route('/assign').post(function(req, res) {
        console.log("************assign*************");
        var Address = global.dbHandel.getModel('address');
        var iname = req.session.user.name;
        var itoken = req.session.user.token;
        var iaddress = req.session.user.institutionAddress;
        var target = req.body.target;
        var asset = req.body.asset;
        var amount = req.body.amount;
        var targetAddress = req.body.targetAddress;
        var assignReason = req.body.assignReason;
        var chain = chainUtil.getAssetChain("mychain");
        var ajaxResult = {
            code: 1,
            tips: ""
        };

        //从数据库获取CCID
        var Asset = global.dbHandel.getModel('asset');
        if (global.CCID === "") {
            Asset.findOne({
                institution: "&^%"
            },
            function (err, doc) {
                if (err || !doc) {
                    console.log("从数据库获取CCID失败");
                    ajaxResult.code = 300;
                    ajaxResult.tips = "从数据库获取CCID失败";
                    ajaxResult = JSON.stringify(ajaxResult);
                    res.json(ajaxResult);
                    return;
                } else {
                    global.CCID = doc.asset;
                }
            });
        }
        
        async.waterfall([
            //校验接收人信息
            function (callback) {
                Address.findOne({
                    user: target,
                    address: targetAddress,
                    asset: asset
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

            //调用sdk登录   
            function (arg, callback) {
                console.log("enrolling " + iname + "...");
                chain.enroll(iname, itoken, function (err, organization) {
                    if (err) {
                        callback(err);
                    } else {
                        console.log("enroll " + iname + " ok");
                        callback(null, organization);
                    }
                });
            },
            //调用sdk获取证书交易  
            function (arg, callback) {
                arg.getUserCert(null, function (err, organizationCert) {
                    if (err) {
                        callback(err);
                    } else {
                        var req = {
                            chaincodeID: global.CCID,
                            fcn: "issueCoinToUser",
                            args: [organizationCert.encode().toString('base64'), iaddress, asset, amount, targetAddress, assignReason],
                            confidential: true,
                            userCert: organizationCert
                        };
                        var tx = arg.invoke(req);
                        tx.on('submitted', function (results) {
                            console.log("issue invoke complete: %j", results);
                            var Tid = global.dbHandel.getModel('tid');
                            Tid.create({
                                "user": iname,
                                "address": iaddress,
                                "tid": results.uuid,
                                "tips": "积分发放",
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
        ], function (err, result) {
            if (err != null) {
                console.log("积分发放失败");
                console.log(err);
                ajaxResult.code = 201;
                ajaxResult.tips = "积分发放失败";
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