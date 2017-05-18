local wifimodule = require 'wifimodule'
local socketmodule = require 'socketmodule'
local servo = require 'servo'
local timer = require 'timer'
local config = require 'config'
local color = nil

-- Initialize LED-strip and Timer
ws2812.init()
local i, buffer = 0, ws2812.newBuffer(8, 3)
local ledTimer = tmr.create()

-- Initialize Servo
servo.defineServo(3,0,1800)
servo.setServo(3, 1)

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

        servo.setServo(3, 90)
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

  -- Sets interval of 50ms, in order to read potentiometer value
  timer.setInterval(function()
    local potValue = adc.read(0)
    local scaledValue = math.floor(50 -(50 * (potValue / 1024)))

    print(scaledValue)
  end, 250)

  -- When button has been pressed or released
  function onChange()
    if gpio.read(button) < isPressed then
      print('Button pressed!')

      -- -- Temporary turns off lights on button press
      -- clearStrip()
      -- ledTimer:start()

      servo.setServo(3, 90)
      --
      -- -- End feedback after 500ms
      ledTimer:alarm(500, tmr.ALARM_SINGLE, function()
        servo.setServo(3, 1)
        -- setStrip(color)
        -- ledTimer:stop()
      end)

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
