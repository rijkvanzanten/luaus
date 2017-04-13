local wifimodule = require 'wifimodule'
local socketmodule = require 'socketmodule'

function init()
  local ws = socketmodule.initSocket()

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

      ok, json = pcall(cjson.encode, {type = 'nodemcu', code = 1, score = presses})
      if ok then
        ws:send(json)
      else
        print('failed to encode JSON!')
      end

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
