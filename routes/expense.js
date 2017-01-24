var hfc = require('hfc');
var chainUtil = require('../utils/chainUtil');
var async = require('async');

module.exports = function (expense) {
    /* GET query page. */
    expense.route('/expense').get(function (req, res) {
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
                        res.render("expense", {
                            user: req.session.user.name,
                            title: '积分消费',
                            addressList: []
                        }); //渲染assign页面
                    } else {
                        res.render("expense", {
                            user: req.session.user.name,
                            title: '积分消费',
                            addressList: doc
                        }); //渲染assign页面
                    }
                }).sort({ '_id': -1 });
            }
        }
    });
    expense.route('/expense').post(function (req, res) {
        console.log("************expense*************");
        var uname = req.session.user.name;
        var token = req.session.user.token;
        var address = req.body.address;
        var asset = req.body.asset;
        var amount = req.body.amount;
        var expenseReason = req.body.expenseReason;
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

        //调用sdk
        var chain = chainUtil.getAssetChain("mychain");
        console.log("enrolling " + uname + "...");
        chain.enroll(uname, token, function (err, user) {
            if (err) {
                console.log("用户登录失败");
                ajaxResult.code = 201;
                ajaxResult.tips = "用户登录失败";
                ajaxResult = JSON.stringify(ajaxResult);
                res.json(ajaxResult);
                return;
            }else{
                console.log("enroll " + uname + " ok");
                user.getUserCert(null, function (err, userCert) {
                    if (err) {
                        console.log("获取证书失败");
                        ajaxResult.code = 202;
                        ajaxResult.tips = "获取证书失败";
                        ajaxResult = JSON.stringify(ajaxResult);
                        res.json(ajaxResult);
                        return;
                    }else{
                        var req = {
                            chaincodeID: global.CCID,
                            fcn: "exchangeCoin",
                            args: [userCert.encode().toString('base64'), address, asset, amount, expenseReason],
                            confidential: true,
                            userCert: userCert
                        };
                        var tx = user.invoke(req);
                        tx.on('submitted', function (results) {
                            console.log("expense invoke complete: %j", results);
                            // 更新tid对象置入model,记录交易信息
                            var Tid = global.dbHandel.getModel('tid');
                            Tid.create({
                                "user": uname,
                                "address": address,
                                "tid": results.uuid,
                                "tips": "积分消费",
                                "time": new Date().toLocaleString()
                            },
                            function(err, result) {
                                if (err) {
                                    console.log("数据库操作失败");
                                    ajaxResult.code = 203;
                                    ajaxResult.tips = "数据库操作失败";
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
                        tx.on('error', function (err) {
                            console.log("积分消费失败");
                            ajaxResult.code = 204;
                            ajaxResult.tips = "积分消费失败";
                            ajaxResult = JSON.stringify(ajaxResult);
                            res.json(ajaxResult);
                            return;
                        });
                    }
                });                
            }
        });
    });
};