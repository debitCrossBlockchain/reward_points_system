var hfc = require('hfc');
var chainUtil = require('../utils/chainUtil');
var restUrl = "121.42.49.127:7000"

module.exports = function (restTest) {
    /* GET assign page. */
    restTest.route('/restTest').get(function (req, res) {
        if (!req.session.user) { //到达路径首先判断是否已经登录
            req.session.error = "请先登录";
            res.redirect("/login"); //未登录
        } else {
            if (req.session.user.type != "3") {
                req.session.user = null;
                req.session.error = "请先登录";
                res.redirect("/login");
            } else {
                res.render("restTest", {
                    user: req.session.user.name,
                    title: 'rest测试'
                }); //渲染页面
            }
        }
    });
    restTest.route('/restTest').post(function (req, res) {
        console.log("************restTest*************");
        var op = req.body.op;
        var args = req.body.args;
        var ajaxResult = {
            code: 1,
            tips: ""
        };

        //调用sdk
        var blockInfo = hfc.newBlockInfo(restUrl);
        if(op === "peers"){
            blockInfo.getPeers(function(err,result){
                if(err){
                    console.log("获取节点信息失败");
                    ajaxResult.code = 201;
                    ajaxResult.tips = "获取节点信息失败";
                    ajaxResult = JSON.stringify(ajaxResult);
                    res.json(ajaxResult);
                    return;                    
                } else {
                    console.log("获取节点信息成功");
                    ajaxResult.code = 200;
                    ajaxResult.tips = result;
                    ajaxResult = JSON.stringify(ajaxResult);
                    res.json(ajaxResult);
                    return;                  
                }
            });
        }
        if(op === "chain"){
            blockInfo.getChainInfo(function(err,result){
                if(err){
                    console.log("获取整链信息失败");
                    ajaxResult.code = 202;
                    ajaxResult.tips = "获取整链信息失败";
                    ajaxResult = JSON.stringify(ajaxResult);
                    res.json(ajaxResult);
                    return;                    
                } else {
                    console.log("获取整链信息成功");
                    ajaxResult.code = 200;
                    ajaxResult.tips = result;
                    ajaxResult = JSON.stringify(ajaxResult);
                    res.json(ajaxResult);
                    return;                  
                }
            });
        }
        if(op === "block"){
            blockInfo.getBlockInfo(args,function(err,result){
                if(err){
                    console.log("获取区块信息失败");
                    ajaxResult.code = 203;
                    ajaxResult.tips = "获取区块信息失败";
                    ajaxResult = JSON.stringify(ajaxResult);
                    res.json(ajaxResult);
                    return;                    
                } else {
                    console.log("获取区块信息成功");
                    ajaxResult.code = 200;
                    ajaxResult.tips = result;
                    ajaxResult = JSON.stringify(ajaxResult);
                    res.json(ajaxResult);
                    return;                  
                }
            });
        }
        if(op === "tx"){
            blockInfo.getTxInfo(args,function(err,result){
                if(err){
                    console.log("获取交易信息失败");
                    ajaxResult.code = 204;
                    ajaxResult.tips = "获取交易信息失败";
                    ajaxResult = JSON.stringify(ajaxResult);
                    res.json(ajaxResult);
                    return;                    
                } else {
                    console.log("获取交易信息成功");
                    ajaxResult.code = 200;
                    ajaxResult.tips = result;
                    ajaxResult = JSON.stringify(ajaxResult);
                    res.json(ajaxResult);
                    return;                  
                }
            });
        }        
    });
};