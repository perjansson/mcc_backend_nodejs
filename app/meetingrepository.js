var cradle = require('cradle');
var nconf = require('nconf');
var logger = require('./logger.js');

var db = null;

exports.connect = function() {
    var dbHost = nconf.get('db_host');
    var dbUserName = nconf.get('db_username');
    var dbPassword = nconf.get('db_password');
    var dbName = nconf.get('db_name');

    logger.log("Trying to connect to database host: " + dbHost);
    var connection = new (cradle.Connection)(dbHost, {
        auth: { username: dbUserName, password: dbPassword }
    });

    db = connection.database(dbName);

    logger.log('Successfully connected to couchdb');

    return db;
}

exports.getTopList = function(callback) {
    db.view(nconf.get('db_view_top_list'), function (err, res) {
        var meetings = [];
        res.forEach(function (meeting) {
            meetings.push(meeting);
        });
        callback(meetings);
    });
}