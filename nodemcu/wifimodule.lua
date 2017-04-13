local wifimodule = {}

function wifimodule.connect(callback)
  -- Connect to Wi-Fi
  wifi.setmode(wifi.STATION)
  wifi.sta.config('HvA Open Wi-Fi', '')
  wifi.sta.eventMonReg(wifi.STA_IDLE, function() print('STATION_IDLE') end)
  wifi.sta.eventMonReg(wifi.STA_CONNECTING, function() print('STATION_CONNECTING') end)
  wifi.sta.eventMonReg(wifi.STA_WRONGPWD, function() print('STATION_WRONG_PASSWORD') end)
  wifi.sta.eventMonReg(wifi.STA_APNOTFOUND, function() print('STATION_NO_AP_FOUND') end)
  wifi.sta.eventMonReg(wifi.STA_FAIL, function() print('STATION_CONNECT_FAIL') end)
  wifi.sta.eventMonReg(wifi.STA_GOTIP, function()
    print('STATION_GOT_IP')
    local conn = net.createConnection(net.TCP, false)
    ip, nm, gateway = wifi.sta.getip()

    local redirHost = gateway .. ':8002'

    -- Auto-accept HvA open wifi thingy
    conn:on('receive', function(sck, c)
      print('Connected to HvA Open Wi-Fi!')
      callback()
    end)

    conn:on('connection', function(sck, c)
      sck:send('POST / HTTP/1.1\r\nHost: ' .. redirHost .. '\r\nOrigin: http://' .. redirHost .. '\r\nContent-Type: application/x-www-form-urlencoded\r\nReferer: http://' .. redirHost .. '/index.php\r\nContent-Length: 52\r\n\r\nredirurl=http%3A%2F%2Fwww.hva.nl%2F&accept=Verbinden')
    end)

    conn:connect(8002, gateway)
  end)
  wifi.sta.eventMonStart()
  wifi.sta.connect()
end

return wifimodule
