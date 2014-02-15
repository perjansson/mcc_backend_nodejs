var socketio = require('socket.io');
var meetingRepository = require('./meetingrepository.js');
var meetingStuffUpdater = require('./meetingstuffupdater.js');

var db = meetingRepository.connect();

module.exports = function (app) {
    var io = socketio.listen(app);
    io.set('log level', 1);

    io.sockets.on('connection', function (socket) {

        socket.on('meeting update request', function (meetingAsString) {
            var meeting = JSON.parse(meetingAsString);
            meetingRepository.saveMeeting(meeting, function (meeting) {var meetings = [meeting];
                meetingStuffUpdater.updateMeetingWithStuff(meetings, function (updatedMeetings) {
                    io.sockets.emit('meeting update response', updatedMeetings[0]);
                });
                updateSocketClientsWithLatestTopList();
            }, function (errorMessage) {
                socket.emit('meeting error', errorMessage);
            });
        });

        socket.on('meeting status request', function (meetingId) {
            meetingRepository.getMeetingById(meetingId, function (meeting) {
                var meetings = [meeting];
                meetingStuffUpdater.updateMeetingWithStuff(meetings, function (updatedMeetings) {
                    socket.emit('meeting status response', updatedMeetings[0]);
                });
            }, function (errorMessage) {
                socket.emit('meeting status error', errorMessage);
            });
        });

        socket.on('meeting delete request', function (meetingId) {
            meetingRepository.deleteMeetingById(meetingId, function (meeting) {
                socket.emit('meeting delete response', meeting);
                updateSocketClientsWithLatestTopList();
            }, function (errorMessage) {
                socket.emit('meeting delete error', errorMessage);
            });
        });

        socket.on('top list request', function () {
            updateSocketClientsWithLatestTopList();
        });

        function updateSocketClientsWithLatestTopList() {
            meetingRepository.getTopList(function (meetings) {
                meetingStuffUpdater.updateMeetingWithStuff(meetings, function (updatedMeetings) {
                    io.sockets.emit('top list update response', updatedMeetings);
                });
            });
        }
    });
}