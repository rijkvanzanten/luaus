local wifimodule = require 'wifimodule'
local socketmodule = require 'socketmodule'
local config = require 'config'
local color = nil

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

function clearStrip()
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
      color = data.color

      setStrip(data.color)
    elseif data.action == 'SPECTATE' then
      ledLoop(100, {
        0, 255, 0
      })
    elseif data.action == 'END_GAME' then
      -- Check if button belongs to winner
      if data.winner.id == node.chipid() then
        ledLoop(50, {
          color
        })
      else
        clearStrip()
      end
    elseif data.action == 'RESET_GAME' then
      clearStrip()
      setStrip(color)
    end
  end)

  -- Read button
  local button = 1
  local isPressed = 1

  -- clear LED-strip
  clearStrip()

  -- When button has been pressed or released
  function onChange()
    if gpio.read(button) < isPressed then
      print('Button pressed!')

      -- local color = buffer:get(1)
      -- print(color .. color2 .. color3)

      -- ledTimer:alarm(1000, tmr.ALARM_SINGLE, function()
      --   ledLoop(50, {
      --
      --   })
      -- end)

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
