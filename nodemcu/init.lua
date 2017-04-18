local wifimodule = require 'wifimodule'
local socketmodule = require 'socketmodule'
local config = require 'config'

-- Initialize LED-strip and Timer
ws2812.init()
local i, buffer = 0, ws2812.newBuffer(8, 3)
local ledTimer = tmr.create()

-- Fill the LED_strip with a single color
function setStrip(colorArray)
  buffer:fill(colorArray[1], colorArray[2], colorArray[3])
  ws2812.write(buffer)
end

-- Make the LED-strip loop
function ledLoop(interval, colorArray)
  ledTimer:register(interval, 1, function()
    i = i + 1
      buffer:fade(2)
      buffer:set(i % buffer:size() + 1, colorArray[1], colorArray[2], colorArray[3])
      ws2812.write(buffer)
  end)

  ledTimer:start()
end

function resetStrip()
  buffer:fill(0, 0, 0)
  ws2812.write(buffer)
  ledTimer:stop()
end

-- Initialize application on NodeMCU
function init()
  -- Receive socket events
  local ws = socketmodule.initSocket()

  ws:on('receive', function(_, msg)
    local data = cjson.decode(msg)

    if data.action == 'CHANGE_COLOR' then
      setStrip(data.color)
    elseif data.action == 'END_GAME' then
      print('game has ended')
    end
  end)

  -- Read button
  local button = 1
  local isPressed = 1

  -- Reset LED-strip
  resetStrip()

  -- When button has been pressed or released
  function onChange()
    if gpio.read(button) < isPressed then
      print('Button pressed!')

      ok, json = pcall(cjson.encode, {
        device = 'nodemcu',
        action = 'UPDATE_SCORE',
        id = node.chipid()
      })
      if ok then
        ws:send(json)
      else
        print('failed to encode JSON!')
      end
    end

    isPressed = gpio.read(button)
  end

  gpio.mode(button, gpio.INT, gpio.PULLUP)
  gpio.trig(button, 'both', onChange)
end

-- Provide Wi-fi connection feedback
ledLoop(250, {
  255, 255, 255
})

-- Initilize Wi-fi connection
wifimodule.connect(config, init)
