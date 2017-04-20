local wifimodule = {}

-- Connect to Wi-Fi
function wifimodule.connect(network, callback)
  wifi.setmode(wifi.STATION)
  wifi.sta.config(network.ssid, network.password)
  wifi.sta.eventMonReg(wifi.STA_IDLE, function() print('[Wi-Fi] Idle') end)
  wifi.sta.eventMonReg(wifi.STA_CONNECTING, function() print('[Wi-Fi] Connecting...') end)
  wifi.sta.eventMonReg(wifi.STA_WRONGPWD, function() print('[Wi-Fi] Wrong Password') end)
  wifi.sta.eventMonReg(wifi.STA_APNOTFOUND, function() print('[Wi-Fi] No access point found') end)
  wifi.sta.eventMonReg(wifi.STA_FAIL, function() print('[Wi-Fi] Failed to connect') end)
  wifi.sta.eventMonReg(wifi.STA_GOTIP, function()
    print('[Wi-Fi] Received valid IP')
    local conn = net.createConnection(net.TCP, false)
    ip, nm, gateway = wifi.sta.getip()

    local redirHost = gateway .. ':8002'

    conn:on('receive', function(sck, c)
      print('[Wi-Fi] Connected to ' .. network.ssid .. '!')
      callback()
    end)

    conn:on('connection', function(sck, c)
      -- Auto-accept HvA open wifi
      if network.ssid == 'HvA Open Wi-Fi' then
        sck:send('POST / HTTP/1.1\r\nHost: ' .. redirHost .. '\r\nOrigin: http://' .. redirHost .. '\r\nContent-Type: application/x-www-form-urlencoded\r\nReferer: http://' .. redirHost .. '/index.php\r\nContent-Length: 52\r\n\r\nredirurl=http%3A%2F%2Fwww.hva.nl%2F&accept=Verbinden')
      else
        sck:send("GET /get HTTP/1.1\r\nHost: httpbin.org\r\nConnection: keep-alive\r\nAccept: */*\r\n\r\n")
      end
    end)

    -- conn:connect(8002, gateway)
    conn:connect(80,"httpbin.org")
  end)
  wifi.sta.eventMonStart()
  wifi.sta.connect()
end

return wifimodule
