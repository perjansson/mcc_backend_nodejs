var nconf = require('nconf');
var cradle = require('cradle');
var uuid = require('node-uuid');
var socketio = require('socket.io');
var async = require('async');
var currencyConversion = require('./currencyconversion.js');
var numberutil = require('./numberutil.js');
var logger = require('./logger.js');

var db = null;
nconf.file('./config/config.json');

module.exports = function (app) {

    var io = socketio.listen(app);
    io.set('log level', 1);

    io.sockets.on('connection', function (socket) {
        connectToCouchDb();

        socket.on('meeting update request', function (data) {
            var meeting = JSON.parse(data);
            if (meeting.id == null || meeting.id == '') {
                meeting.id = uuid.v4();
                logger.log('Generated new id: ' + meeting.id);
            }

            db.save(meeting.id, meeting, function (err, res) {
                if (err) {
                    var errorMessage = JSON.stringify(err);
                    logger.log('Error saving meeting with id: ' + meeting.id + ' Error: ' + errorMessage);
                    socket.emit('meeting error', errorMessage);
                } else {
                    logger.log('meeting update response for meeting with id: ' + meeting.id);
                    socket.emit('meeting update response', meeting);
                }

            });
        });

        socket.on('top list request', function () {
            db.view(nconf.get('db_view_top_list'), function (err, res) {
                var meetings = [];
                res.forEach(function (meeting) {
                    meetings.push(meeting);
                });
                updateMeetingWithStuff(meetings, socket);
            });
        });
    });

    function connectToCouchDb() {
        if (db == null) {
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
        }
    }

    function updateMeetingWithStuff(meetings, socket) {
        var updatedMeetings = [];

        async.forEach(meetings, function (meeting, callback) {
            meeting.comparableCurrency = nconf.get('comparable_currency');

            var conversionRate = currencyConversion.getConversionRate(meeting.currency);
            if (conversionRate) {
                var meetingCostInComparisionCurrency = meeting.meetingCost * conversionRate;
                meeting.comparableMeetingCost = numberutil.roundToDecimals(meetingCostInComparisionCurrency, 5);
                updatedMeetings.push(meeting);
            }

            meeting.duration = meeting.meetingCost / meeting.numberOfAttendees / meeting.averageHourlyRate * 3600;
            meeting.prettyDuration = getPrettyMeetingDuration(meeting);

            callback();

        }, function (err) {
            logger.log('top list update response');
            socket.emit('top list update response', updatedMeetings);
        });
    }

    function getPrettyMeetingDuration(meeting) {
        var prettyMeetingTime = null;
        var timeInHours = meeting.meetingCost / meeting.numberOfAttendees / meeting.averageHourlyRate;
        var hours, minutes, seconds = null;
        if (timeInHours >= 1) {
            var array = numberutil.roundToDecimals(timeInHours, 2).toString().split('.');
            hours = parseInt(array[0]);
            minutes = parseInt(array[1]);
            prettyMeetingTime = hours + " h " + minutes + " min";
        } else if (timeInHours >= 0.01666666666667) {
            minutes = timeInHours * 60;
            prettyMeetingTime = numberutil.roundToDecimals(minutes, 0) + " min";
        } else {
            seconds = timeInHours * 3600;
            prettyMeetingTime = numberutil.roundToDecimals(seconds, 0) + " s";
        }
        return  prettyMeetingTime;
    }

}