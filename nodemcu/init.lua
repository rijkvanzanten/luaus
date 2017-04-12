local wifimodule = require 'wifimodule'
local config = require 'config'

function connectSocket()
  print('connect to ws at ws://' .. config.ip .. ':' .. config.port .. '/socket.io/?EIO=3&transport=websocket')
  local ws = websocket.createClient()

  ws:on('connection', function(ws)
    print('Connected to socket')
  end)

  ws:on('receive', function(_, msg)
    print('got message: ', msg)
  end)

  ws:on('close', function(_, status)
    print('connection closed', status)
    ws = nil
  end)

  ws:connect('ws://' .. config.ip .. ':' .. config.port .. '/socket.io/?EIO=3&transport=websocket')
end

wifimodule.connect(connectSocket)

-- Read button
local pin = 1
local presses = 0
local state = 1

function onChange()
  if gpio.read(pin) < state then
    presses = presses + 1
    print('Button has been pressed ' .. presses .. ' times')
  end

  state = gpio.read(pin)
end

gpio.mode(pin, gpio.INT, gpio.PULLUP)
gpio.trig(pin, 'both', onChange)
