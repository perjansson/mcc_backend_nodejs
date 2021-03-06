var async = require('async');
var nconf = require('nconf');
var currencyConversion = require('./currencyconversion.js');
var numberutil = require('./numberutil.js');
var logger = require('./logger.js');

nconf.file('./config/config.json');

exports.updateMeetingWithStuff = function (meetings, callback) {
    var updatedMeetings = [];

    async.forEach(meetings, function (meeting, callback) {
        meeting.comparableCurrency = nconf.get('comparable_currency');

        var conversionRate = currencyConversion.getConversionRate(meeting.currency);
        if (conversionRate) {
            var meetingCostInComparisonCurrency = meeting.meetingCost * conversionRate;
            meeting.comparableMeetingCost = numberutil.roundToDecimals(meetingCostInComparisonCurrency, 5);
        }

        meeting.duration = meeting.meetingCost / meeting.numberOfAttendees / meeting.averageHourlyRate * 3600;
        meeting.prettyDuration = getPrettyMeetingDuration(meeting);
        updatedMeetings.push(meeting);

        callback();

    }, function (err) {
        callback(updatedMeetings);
    });
}

const decimalToTimeFactor = 0.6;

function getPrettyMeetingDuration(meeting) {
    var timeInHours = meeting.meetingCost / meeting.numberOfAttendees / meeting.averageHourlyRate;
    return timeInHoursToPrettyMeetingDuration(timeInHours);
}

function timeInHoursToPrettyMeetingDuration(timeInHours) {
    var prettyMeetingDuration = null;
    var hours, minutes, seconds = null;
    if (timeInHours >= 1) {
        var array = numberutil.roundToDecimals(timeInHours, 2).toString().split('.');
        hours = parseInt(array[0]);
        minutes = numberutil.roundToDecimals(parseInt(array[1]) * decimalToTimeFactor, 0);
        prettyMeetingDuration = hours + " h " + minutes + " min";
    } else if (timeInHours >= 0.01666666666667) {
        minutes = timeInHours * 60;
        prettyMeetingDuration = numberutil.roundToDecimals(minutes, 0) + " min";
    } else {
        seconds = timeInHours * 3600;
        prettyMeetingDuration = numberutil.roundToDecimals(seconds, 0) + " s";
    }
    return prettyMeetingDuration;
}