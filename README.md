<h1 align="center">
	<img width="400" src="media/logo.png" alt="Logo">
	<br>
	<br>
</h1>

<p align="center">
	<b>🚨 Scoreboard @ <a href="http://luaus.rijks.website">luaus.rijks.website</a> 🚨</b>
</p>

[![Build Status](https://semaphoreci.com/api/v1/rijkvanzanten/luaus/branches/master/shields_badge.svg)](https://semaphoreci.com/rijkvanzanten/luaus)
[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)

<br>

# **luaus** |ˈlo͞oou|  
noun  
a Hawaiian party or feast, especially one accompanied by entertainment.

Luaus is an online scoreboard for all your favorite (board) games. Wanna play a match of fooßball? Keep track of your score with Luaus!


## Usage

Clone the repo and install the dependencies with
`$ npm install`

To start the app run
`$ npm run start`

To start the server with nodemon run
`$ npm run dev-server`

To watch for client-side file changes run
`$ npn run dev-client`

Add your own .env file with the following contents:
```
TWITTER_CONSUMER_KEY=<consumer_key>
TWITTER_CONSUMER_SECRET=<consumer_secret>
TWITTER_ACCESS_TOKEN_KEY=<access_token_key>
TWITTER_ACCESS_TOKEN_SECRET=<access_token_secret>
```

## NodeMCU modules used
| Module | Description |
|---|---|
| [`cjson`](https://nodemcu.readthedocs.io/en/master/en/modules/cjson/) |  The JSON support module. Allows encoding and decoding to/from JSON. |
| [`file`](https://nodemcu.readthedocs.io/en/master/en/modules/file/) | The file module provides access to the file system and its individual files. |
| [`gpio`](https://nodemcu.readthedocs.io/en/master/en/modules/gpio/) | This module provides access to the GPIO (General Purpose Input/Output) subsystem. |
| [`http`](https://nodemcu.readthedocs.io/en/master/en/modules/http/) | Basic HTTP client module that provides an interface to do GET/POST/PUT/DELETE over HTTP(S), as well as customized requests. |
| [`net`](https://nodemcu.readthedocs.io/en/master/en/modules/net/) | This module is used for different server and client actions, like creating and closing a server. |
| [`node`](https://nodemcu.readthedocs.io/en/master/en/modules/node/) | The node module provides access to system-level features such as sleep, restart and various info and IDs. |
| [`tmr`](https://nodemcu.readthedocs.io/en/master/en/modules/tmr/) | The tmr module allows access to simple timers, the system counter and uptime. |
| [`uart`](https://nodemcu.readthedocs.io/en/master/en/modules/uart/) | The UART (Universal asynchronous receiver/transmitter) module allows configuration of and communication over the UART serial port |
| [`websocket`](https://nodemcu.readthedocs.io/en/master/en/modules/websocket/) | A websocket client module that implements RFC6455 (version 13) and provides a simple interface to send and receive messages. |
| [`wifi`](https://nodemcu.readthedocs.io/en/master/en/modules/wifi/) | This module provides overall wifi configuration. |
| [`ws2812`](https://nodemcu.readthedocs.io/en/master/en/modules/ws2812/) | ws2812 is a library to handle ws2812-like led strips. It works at least on WS2812, WS2812b, APA104, SK6812 (RGB or RGBW). |

## TODOs & Wishlist
-  [ ] Sound effects when updating score
-  [ ] Allow user to add name to box
-  [ ] Ability to kick players from lobby
_Checkout the [projects page](https://github.com/rijkvanzanten/luaus/projects/1), or our [issues](https://github.com/rijkvanzanten/luaus/issues) for a more up-to-date overview_

## License
MIT License

Copyright &copy; 2017 Rijk van Zanten & Berend Pronk
