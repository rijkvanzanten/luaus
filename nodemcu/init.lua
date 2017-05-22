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
servo.defineServo(3, 0, 1800)
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
      if tonumber(data.id) == node.chipid() then
        clearStrip()
        color = data.color
        setStrip(data.color)
      end;

      -- Reset servo when a new game has begun
      servo.setServo(3, 1)
    elseif data.action == 'SPECTATE' then
      ledLoop(100, {
        0, 255, 0
      })
    elseif data.action == 'END_GAME' then
      -- Check if button belongs to winner
      if tonumber(data.winner) == node.chipid() then
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
  local curValue = nil
  timer.setInterval(function()
    local potValue = adc.read(0)
    local scaledValue = math.ceil(50 - (49 * (potValue / 1024)))

    if scaledValue ~= curValue then
      curValue = scaledValue
      print(scaledValue)

      ok, json = pcall(cjson.encode, {
        action = 'SET_MAX_SCORE',
        score = scaledValue,
        id = node.chipid()
      })
      if ok then
        ws:send(json)
      else
        print('failed to encode JSON!')
      end
    end
  end, 250)

  -- When button has been pressed or released
  function onChange()
    if gpio.read(button) < isPressed then
      print('Button pressed!')

      if color ~= nil then
        -- Temporary turns off lights on button press
        setStrip({
          255, 255, 255
        })
        ledTimer:start()

        -- End feedback after 100ms
        ledTimer:alarm(100, tmr.ALARM_SINGLE, function()
          setStrip(color)
          ledTimer:stop()
        end)
      end

      ok, json = pcall(cjson.encode, {
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
