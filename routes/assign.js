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
                        res.render("assign", {
                            user: req.session.user.name,
                            title: '资产申请',
                            assetList: [],
                            addressList: []
                        }); //渲染assign页面
                    } else {
                        res.render("assign", {
                            user: req.session.user.name,
                            title: '资产申请',
                            assetList: result[1],
                            addressList: result[0]
                        }); //渲染assign页面
                    }
                });
            }
        }
    });
    assign.route('/assign').post(function(req, res) {
        console.log("************assign*************");
        var uname = req.session.user.name;
        var token = req.session.user.token;
        var iname = req.session.user.institution;
        var itoken = req.session.user.institutionToken;
        var iaddress = req.session.user.institutionAddress;
        var amount = req.body.amount;
        var address = req.body.address;
        var asset = req.body.asset;
        var Asset = global.dbHandel.getModel('asset');
        var chain = chainUtil.getAssetChain("mychain");
        var ajaxResult = {
            code: 1,
            tips: ""
        };
        
        async.waterfall([
            //设置资产有效期  
            function (callback) {
                Asset.findOne({
                    institution: iname,
                    asset: asset
                },
                function (err, doc) {
                    if (err) {
                        callback(err);
                    } else if (!doc) {
                        callback("no asset");
                    }
                    else {
                        var year = 0;
                        switch (doc.expire) {
                            case "1年":
                                year = 1;
                                break;
                            case "2年":
                                year = 2;
                                break;
                            case "3年":
                                year = 3;
                        }
                        //转化有效期格式
                        var now = new Date();
                        now.setFullYear(now.getFullYear() + year);
                        test = now.toLocaleDateString();
                        var arr = [];
                        arr = test.split("-");
                        var dateStr = arr.join("");
                        callback(null, dateStr);
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
                        callback(null, arg, organization);
                    }
                });
            },
            //调用sdk获取证书交易  
            function (arg1, arg2, callback) {
                arg2.getUserCert(null, function (err, organizationCert) {
                    if (err) {
                        callback(err);
                    }else{
                        var req = {
                            chaincodeID: "f23b78574abebbbe42ddf37326a4acd9a33e38e1fc3f0ae54615609181445aa0",
                            fcn: "assign",
                            args: [organizationCert.encode().toString('base64'), iaddress, address, asset, arg1, amount, "belink_assign"],
                            confidential: true,
                            userCert: organizationCert
                        };
                        var tx = arg2.invoke(req);
                        var txid;
                        tx.on('submitted', function (results) {
                            txid = results.uuid;
                        });
                        tx.on('complete', function (results) {
                            console.log("assign invoke complete: %j", results);
                            // 更新tid对象置入model,记录交易信息
                            var Tid = global.dbHandel.getModel('tid');
                            Tid.create({
                                "user": uname,
                                "address": address,
                                "tid": txid,
                                "tips": "资产申请",
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
                console.log("申请资产失败");
                console.log(err);
                ajaxResult.code = 201;
                ajaxResult.tips = "申请资产失败";
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