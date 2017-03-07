module.exports = function(goods) {
    /* Get goods page.*/
    goods.route('/goods').get(function(req, res) {
        if (!req.session.user) { //到达/goods路径首先判断是否已经登录
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
                        res.render("goods", {
                            user: req.session.user.name,
                            title: '添加商品',
                            assetList: []
                        }); //渲染goods页面
                    } else {
                        res.render("goods", {
                            user: req.session.user.name,
                            title: '添加商品',
                            assetList: doc
                        }); //渲染goods页面
                    }
                }).sort({ '_id': -1 });
            }
        }
    });
    goods.route('/goods').post(function (req, res) {
        console.log("************add goods*************");
        var ins = req.session.user.name;
        var asset = req.body.asset;
        var goodsName = req.body.goodsName;
        var price = req.body.price;
        var ajaxResult = {
            code: 1,
            tips: ""
        };
        var Goods = global.dbHandel.getModel('goods');
        
        Goods.findOne({
            "institution": ins,
            "asset": asset,
            "name": goodsName
        },
        function (err, doc) {
            if (err) {
                console.log(err);
                ajaxResult.code = 201;
                ajaxResult.tips = "数据库操作失败";
                ajaxResult = JSON.stringify(ajaxResult);
                res.json(ajaxResult);
                return;
            } else if (doc) {
                ajaxResult.code = 202;
                ajaxResult.tips = "商品已存在";
                ajaxResult = JSON.stringify(ajaxResult);
                res.json(ajaxResult);
                return;
            } else {
                Goods.create({
                    "institution": ins,
                    "asset": asset,
                    "name": goodsName,
                    "price": price
                },
                function (err, results) {
                    if (err) {
                        console.log(err);
                        ajaxResult.code = 201;
                        ajaxResult.tips = "数据库操作失败";
                    } else {
                        console.log(results);
                        ajaxResult.code = 200;
                    }
                    ajaxResult = JSON.stringify(ajaxResult);
                    res.json(ajaxResult);
                    return;
                });
            }
        });
    });
};