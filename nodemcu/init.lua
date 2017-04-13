local wifimodule = require 'wifimodule'
local socketmodule = require 'socketmodule'

function init()
  -- Initializes LED-strip
  ws2812.init()
  local i, buffer = 0, ws2812.newBuffer(8, 3)

  -- Receive socket events
  local ws = socketmodule.initSocket()

  ws:on('receive', function(_, msg)
    local data = cjson.decode(msg)
    if data.type == 'color' and data.id == node.chipid() then
      if data.color == 'red' then
        print('[Led] Turn RED')
      else
        print('[Led] Turn BLUE')
      end
    end
  end)

  -- Read button
  local pin = 1
  local score = 0
  local state = 1

  function onChange()
    if gpio.read(pin) < state then
      score = score + 1
      print('Button has been pressed ' .. score .. ' times')

      ok, json = pcall(cjson.encode, {device = 'nodemcu', code = 1, id = node.chipid(), score = score})
      if ok then
        ws:send(json)
      else
        print('failed to encode JSON!')
      end

      for i = 1, score do
        buffer:set(i % score + 1, 75, 0, 50)
        -- buffer:set(i % score + 1, 25, 150, 0) RED
        ws2812.write(buffer)
      end

      if score == 8 then
        -- tmr.create():alarm(50, 1, function()
        --   i = i + 1
        --   buffer:fade(2)
        --   buffer:set(i % buffer:size() + 1, 75, 0, 50)
        --   -- buffer:set(i % buffer:size() + 1, 25, 150, 0) RED
        --   ws2812.write(buffer)
        -- end)
      end
    end

    state = gpio.read(pin)
  end

  gpio.mode(pin, gpio.INT, gpio.PULLUP)
  gpio.trig(pin, 'both', onChange)
end

wifimodule.connect(init)
