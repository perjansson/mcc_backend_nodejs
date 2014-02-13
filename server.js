var port = 1337;

//require('./app/newrelic');
var http = require('http');
var app = http.createServer(function (req, http_res) {
    http_res.writeHead(200, {'Content-Type': 'text/plain'});
    http_res.end('Node.js server up and running v-(*_*)z');
});

app.listen(port);

require('./app/socketio')(app);