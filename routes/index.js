module.exports = function (index) {
    /* GET index page. */
    index.get('/', function (req, res, next) {
        res.render('index', {
            title: '易诚互动区块链'
        });
    });
    /* GET index page. */
    index.get('/index', function (req, res, next) {
        res.render('index', {
            title: '易诚互动区块链'
        });
    });
};