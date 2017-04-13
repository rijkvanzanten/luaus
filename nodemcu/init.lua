local wifimodule = require 'wifimodule'
local config = require 'config'

function init()
  -- Create socket connection
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

  -- Read button
  local pin = 1
  local presses = 0
  local state = 1

  -- Initializes LED-strip
  ws2812.init()
  local i, buffer = 0, ws2812.newBuffer(8, 3)

  buffer:fill(0, 0, 0)
  ws2812.write(buffer)

  function onChange()
    if gpio.read(pin) < state then
      presses = presses + 1
      print('Button has been pressed ' .. presses .. ' times')

      for i = 1, presses do
        buffer:set(i % presses + 1, 75, 0, 50)
        -- buffer:set(i % presses + 1, 25, 150, 0) RED
        ws2812.write(buffer)
      end

      if presses == 8 then
        tmr.create():alarm(50, 1, function()
          i = i + 1
          buffer:fade(2)
          buffer:set(i % buffer:size() + 1, 75, 0, 50)
          -- buffer:set(i % buffer:size() + 1, 25, 150, 0) RED
          ws2812.write(buffer)
        end)
      end
    end

    state = gpio.read(pin)
  end

  gpio.mode(pin, gpio.INT, gpio.PULLUP)
  gpio.trig(pin, 'both', onChange)
end

wifimodule.connect(init)
