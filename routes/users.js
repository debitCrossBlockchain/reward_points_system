module.exports = function (users) {
    /* GET users listing. */
    users.get('/', function (req, res, next) {
        res.send('respond with a resource');
    });
};