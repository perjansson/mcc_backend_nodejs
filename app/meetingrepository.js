var cradle = require('cradle');
var nconf = require('nconf');
var uuid = require('node-uuid');
var logger = require('./logger.js');

nconf.file('./config/config.json');

var db = null;

exports.connect = function () {
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
};

exports.saveMeeting = function (meeting, successCallback, failureCallback) {
    if (meeting.id == null || meeting.id == '') {
        meeting.id = uuid.v4();
        logger.log('Generated new id: ' + meeting.id);
    }

    meeting.lastUpdatedAtTimeStamp = new Date().getTime();

    db.save(meeting.id, meeting, function (err, res) {
        if (err) {
            var errorMessage = JSON.stringify(err);
            logger.log('Error saving meeting with id: ' + meeting.id + ' Error: ' + errorMessage);
            failureCallback(errorMessage);
        } else {
            logger.log('Meeting update response for meeting with id: ' + meeting.id);
            successCallback(meeting);
        }
    });
};

exports.getMeetingById = function (meetingId, successCallback, failureCallback) {
    db.get(meetingId, function (err, meeting) {
        if (err) {
            var errorMessage = JSON.stringify(err);
            logger.log('Error getting meeting with id: ' + meetingId + ' Error: ' + errorMessage);
            failureCallback(errorMessage);
        } else {
            logger.log('Meeting status response for meeting with id: ' + meeting.id);
            successCallback(meeting);
        }
    });
};

exports.deleteMeetingById = function (meetingId, successCallback, failureCallback) {
    db.get(meetingId, function (err, meeting) {
        if (meeting != null) {
            db.remove(meeting.id, meeting._rev, function (err, meeting) {
                if (err) {
                    var errorMessage = JSON.stringify(err);
                    logger.log('Error deleting meeting with id: ' + meetingId + ' Error: ' + errorMessage);
                    failureCallback(errorMessage);
                } else {
                    logger.log('Meeting delete response for meeting with id: ' + meeting.id);
                    successCallback(meeting);
                }
            });
        }
    });
};

exports.getTopList = function (successCallback) {
    db.view(nconf.get('db_view_top_list'), function (err, res) {
        var meetings = createArrayOfMeetings(res);
        successCallback(meetings);
    });
};

exports.getRunningMeetings = function (successCallback) {
    db.view(nconf.get('db_view_running_meetings'), function (err, res) {
        var meetings = createArrayOfMeetings(res);
        successCallback(meetings);
    })
}

function createArrayOfMeetings(res) {
    var meetings = [];
    res.forEach(function (meeting) {
        meetings.push(meeting);
    });
    return meetings;
}