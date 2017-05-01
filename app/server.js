const http = require('http');
const path = require('path');
const bodyParser = require('body-parser');
const express = require('express');
const WebSocket = require('ws');
const broadcast = require('./broadcast');

const rooms = {};

const port = process.env.PORT || 3000;

const app = express()
  .use(bodyParser.urlencoded({ extended: false }))
  .use(express.static(path.join(__dirname, 'public')))
  .set('view engine', 'ejs')
  .set('views', path.join(__dirname, 'views'));

const server = http.createServer(app);
const webSocketServer = new WebSocket.Server({ server });

webSocketServer.broadcast = broadcast;

server.listen(port, function onListen() {
  console.log('Server started at port ' + port);
});
