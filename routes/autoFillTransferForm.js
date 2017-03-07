var async = require('async');

module.exports = function (autoFillTransferForm) {
    /* GET query address. */
    autoFillTransferForm.post("/autoFillTransferForm",
        function (req, res) {
            if (!req.session.user) { //到达路径首先判断是否已经登录
                req.session.error = "请先登录";
                res.redirect("/login"); //未登录则重定向到 /login 路径
            } else {
                if (req.session.user.type != "3") {
                    req.session.user = null;
                    req.session.error = "请先登录";
                    res.redirect("/login");
                } else {                    
                    var addressTarget = req.body.addressTarget;
                    var insOwn = req.body.insOwn;
                    var assetOwn = req.body.assetOwn;
                    var Address = global.dbHandel.getModel('address');
                    var Asset = global.dbHandel.getModel('asset');
                    var ajaxResult = {
                        code: 1,
                        tips1: "",
                        tips2: ""
                    };                    

                    async.auto({

                        //根据账户地址查询接收人
                        getTarget: function (callback) {
                            Address.findOne({
                                address: addressTarget
                            },
                            function (err, doc) {
                                if (err || !doc) {
                                    callback("query target err");
                                } else {
                                    callback(null, doc);
                                }
                            });
                        },

                        //查询接收人积分官方承兑比率
                        getTargetRate: ['getTarget',
                        function (arg, callback) {
                            var insTarget = arg.getTarget.institution;
                            var assetTarget = arg.getTarget.asset;
                            Asset.findOne({
                                institution: insTarget,
                                asset: assetTarget
                            },
                            function (err, doc) {
                                if (err) { 
                                    callback(err);
                                } else if (!doc) {
                                    callback(null, "");
                                } else {
                                    callback(null, doc.rate);
                                }
                            });
                        }],

                        //查询积分拥有人积分官方承兑比率
                        getOwnRate: function (callback) {
                            Asset.findOne({
                                institution: insOwn,
                                asset: assetOwn
                            },
                            function (err, doc) {
                                if (err) {
                                    callback(err);
                                } else if (!doc) {
                                    callback(null, "");
                                } else {
                                    callback(null, doc.rate);
                                }
                            });
                        }
                    }, 
                    function (err, result) {
                        if (err != null) {
                            console.log("计算兑换比率失败");
                            console.log(err);
                            ajaxResult.code = 201;
                            ajaxResult = JSON.stringify(ajaxResult);
                            res.json(ajaxResult);
                            return;
                        } else {
                            console.log(result);
                            ajaxResult.code = 200;
                            ajaxResult.tips1 = JSON.stringify(result.getTarget);
                            if (result.getTargetRate != "" && result.getOwnRate != "") {
                                ajaxResult.tips2 = String(Number(result.getOwnRate) / Number(result.getTargetRate));
                            } else {
                                ajaxResult.tips2 = "";
                            }
                            ajaxResult = JSON.stringify(ajaxResult);
                            res.json(ajaxResult);
                            return;
                        }
                    });
                }
            }
        });
};