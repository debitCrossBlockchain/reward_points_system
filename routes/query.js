var hfc = require('hfc');
var chainUtil = require('../utils/chainUtil');
var async = require('async');

module.exports = function (query) {
    /* GET query page. */
    query.route('/query').get(function (req, res) {
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
                        res.render("query", {
                            user: req.session.user.name,
                            title: '资产查询',
                            assetList: [],
                            addressList: []
                        }); //渲染query页面
                    } else {
                        res.render("query", {
                            user: req.session.user.name,
                            title: '资产查询',
                            assetList: result[1],
                            addressList: result[0]
                        }); //渲染query页面
                    }
                });
            }
        }
    });
    query.route('/query').post(function (req, res) {
        console.log("************query asset*************");
        var uname = req.session.user.name;
        var token = req.session.user.token;
        var address = req.body.address;
        var asset = req.body.asset;
        var ajaxResult = {
            code: 1,
            tips: ""
        };

        //query结果转化为正确json格式字符串
        function ascToStr(inStr) {
            var len = inStr.length;
            if (len % 2 !== 0) {
                return "";
            }
            var charCode;
            var outStr = [];
            for (var i = 0; i < len; i = i + 2) {
                charCode = parseInt(inStr.substr(i, 2), 16);
                outStr.push(String.fromCharCode(charCode));
            }
            return outStr.join("");
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
            }
            console.log("enroll " + uname + " ok");
            console.log("query begin");
            var req = {
                chaincodeID: "f23b78574abebbbe42ddf37326a4acd9a33e38e1fc3f0ae54615609181445aa0",
                fcn: "user",
                args: [address, asset],
                confidential: true,
            };
            var tx = user.query(req);
            tx.on('complete', function (results) {
                console.log("query complete");
                console.log(ascToStr(results.result));
                ajaxResult.code = 200;
                ajaxResult.tips = ascToStr(results.result);
                ajaxResult = JSON.stringify(ajaxResult);
                res.json(ajaxResult);
                return;
            });
            tx.on('error', function (error) {
                console.log("query error");
                ajaxResult.code = 202;
                ajaxResult.tips = "查询资产失败";
                ajaxResult = JSON.stringify(ajaxResult);
                res.json(ajaxResult);
                return;
            });
        });
    });
};