local servo = {}

--
-- define a servo entry where left is the servo value
-- at which it is at 0 degrees and right is the value
-- at which it is at 180 degrees.
--
-- example:
--   defineservo(4,200,1850)
--
-- the parameters are saved in servoleft and servoright
-- and a timernumber is generated and remembered so you
-- can change multiple servo's at the same time
--
function servo.defineServo (pin, left, right)
  if not servoleft then
    servoleft = {}
  end
  if not servoright then
    servoright = {}
  end
  if not servotimer then
    servotimer = {}
  end
  servoleft[pin] = left
  servoright[pin] = right
  servotimer[pin] = 2+#servotimer
  gpio.mode(pin,gpio.OUTPUT)
end

--
-- move the servo on the specified pin to value servovalue
-- this is done in 25 steps
--
function servo.setServovalue (pin, svalue)
  local cnt = 25
  local tmrnum
  if not servotimer or not servotimer[pin] then
    tmrnum = 2
  else
    tmrnum = servotimer[pin]
  end
  servovalue = math.min(2000,math.max(svalue,0))
  tmr.alarm(tmrnum,20,1,function()
    if servovalue and servovalue>0 then
      gpio.write(pin, gpio.HIGH)
      tmr.delay(servovalue)
      gpio.write(pin, gpio.LOW)
    end
    cnt = cnt-1
    if cnt<=0 then
      tmr.stop(tmrnum)
    end
  end)
end

--
-- after you've defined the servo, you can set the angle
-- with this function
--
function servo.setServo (pin, angle)
  local servovalue
  if servoleft[pin] and servoright[pin] then
    servovalue = (servoright[pin]-servoleft[pin])/180*angle+servoleft[pin]
  else
    servovalue = 2000/180*angle
  end
  servo.setServovalue(pin,servovalue)
end

return servo
