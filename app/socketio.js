var socketio = require('socket.io');
var meetingRepository = require('./meetingrepository.js');
var meetingStuffUpdater = require('./meetingstuffupdater.js');

var db = meetingRepository.connect();

module.exports = function (app) {

    var io = socketio.listen(app);
    io.set('log level', 1);

    io.sockets.on('connection', function (socket) {
        socket.on('meeting update request', function (data) {
            var meeting = JSON.parse(data);
            meetingRepository.saveMeeting(meeting, function (meeting) {
                socket.emit('meeting update response', meeting);
            }, function (errorMessage) {
                socket.emit('meeting error', errorMessage);
            });
        });

        socket.on('top list request', function () {
            meetingRepository.getTopList(function (meetings) {
                meetingStuffUpdater.updateMeetingWithStuff(meetings, function (updatedMeetings) {
                    socket.emit('top list update response', updatedMeetings);
                });
            });
        });
    });
}