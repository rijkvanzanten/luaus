local pin = 1
local presses = 0
local state = 1

function onChange()
  if gpio.read(pin) < state then
    presses = presses + 1
    print('The button has been pressed '..presses..' times')
  end

  state = gpio.read(pin)
end

gpio.mode(pin, gpio.INT, gpio.PULLUP)
gpio.trig(pin, 'both', onChange)
