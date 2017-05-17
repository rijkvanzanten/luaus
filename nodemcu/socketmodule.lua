local config = require 'config'
local module = {}

module.initSocket = function ()
  -- Create socket connection
  local ws = websocket.createClient()

  ws:on('connection', function(ws)
    print('[WebSocket] Connected!')

    ok, json = pcall(cjson.encode, {
      device = 'nodemcu',
      action = 'JOIN_GAME',
      id = node.chipid()
    })
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

  print('[WebSocket] Connecting to ws at ws://' .. config.address .. ':' .. config.port .. '/nodemcu')
  ws:connect('ws://' .. config.address .. ':' .. config.port .. '/nodemcu')

  return ws
end

return module
