var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var multer = require('multer');
var mongoose = require('mongoose');
var session = require('express-session');
var ejs = require('ejs');

var index = require('./routes/index');
var users = require('./routes/users');
var home = require('./routes/home');
var logout = require('./routes/logout');
var login = require('./routes/login');
var register = require('./routes/register');
var userAddress = require('./routes/userAddress');
var queryAddress = require('./routes/queryAddress');
var assign = require('./routes/assign');
var transfer = require('./routes/transfer');
var query = require('./routes/query');
var uuid = require('./routes/uuid');
var admin = require('./routes/admin');
var adminHome = require('./routes/adminHome');
var deploy = require('./routes/deploy');
var institution = require('./routes/institution');
var insRegister = require('./routes/insRegister');
var issue = require('./routes/issue');
var restTest = require('./routes/restTest');

var app = express();

//db
global.dbHandel = require('./database/dbHandel');
//global.db = mongoose.createConnection("mongodb://localhost:27017/ynetbcdb");

global.blockchainJson;

global.chainFlag = false;

app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true,
    cookie: { /*secure: true ,*/ maxAge: 1000 * 60 * 30 }
}));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
// app.engine('.html', ejs.__express);
// app.set('view engine', 'html');

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


///路由管理表
index(app); //即为为路径 / 设置路由
users(app); // 即为为路径 /users 设置路由
home(app); //资产管理首页
logout(app); // 即为为路径 /logout 设置路由
login(app); // 即为为路径 /login 设置路由
register(app); // 即为为路径 /register 设置路由
userAddress(app); //账户管理
queryAddress(app); //查询地址
assign(app); //资产申请
transfer(app); //资产转移
query(app); //资产查询
uuid(app);
restTest(app);

//管理员功能
admin(app);
adminHome(app);
deploy(app);
institution(app);
insRegister(app);
issue(app);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

//module.exports = app;
app.listen(8888);