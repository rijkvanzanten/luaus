local config = require 'config'

local module = {}

module.initSocket = function ()
  -- Create socket connection
  print('[WebSocket] Connecting to ws at ws://' .. config.ip .. ':' .. config.port .. '...')
  local ws = websocket.createClient()

  ws:on('connection', function(ws)
    print('[WebSocket] Connected!')

    ok, json = pcall(cjson.encode, {device = 'nodemcu', code = 0, id = node.chipid()})
    if ok then
      ws:send(json)
    else
      print('[WebSocket] Failed to encode JSON!')
    end
  end)

  ws:on('close', function(_, status)
    print('[WebSocket] Connection closed.', status)
    ws = nil
  end)

  ws:connect('ws://' .. config.ip .. ':' .. config.port)

  return ws
end

return module
