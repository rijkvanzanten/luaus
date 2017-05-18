------------------------------------------------------------------------------
-- Timer Utility in Node.js Style
-- LICENSE: MIT
-- Simen Li <simenkid@gmail.com>
------------------------------------------------------------------------------
local timer = {}
local _exequeImmed, exequeImmed, exeque, ttbl = {}, {}, {}, {}
local tick, lock = 2, false

timer.enable = false
timer.id = 6

local function rmEntry(tbl, pred)
    if (pred == nil) then return end
    local x, len = 0, #tbl
    for i = 1, len do
        local trusy, idx = false, (i - x)
        if (type(pred) == 'function') then trusy = pred(tbl[idx])
        else trusy = tbl[idx] == pred
        end

        if (tbl[idx] ~= nil and trusy) then
            tbl[idx] = nil
            table.remove(tbl, idx)
            x = x + 1
        end
    end
    return tbl
end

local function checkloops()
    if (lock) then return else lock = true end
    local tobj
    for i, tob in ipairs(ttbl) do
        tob.delay = tob.delay - tick
        if (tob.delay <= tick) then
            table.insert(exeque, tob)
            ttbl = rmEntry(ttbl, tob)
        end
    end

    for i = 1, #_exequeImmed do table.insert(exequeImmed, _exequeImmed[i]) end
    rmEntry(_exequeImmed, function (v) return v ~= nil end)

    if (#exequeImmed > 0) then  -- Immediately execute all targets
        for i, immed in ipairs(exequeImmed) do
            local status, err = pcall(immed.f, unpack(immed.argus))
            if not (status) then print("Task execution fails: " .. tostring(err)) end
        end
        rmEntry(exequeImmed, function (v) return v ~= nil end)
    elseif (#exeque > 0) then
        tobj = exeque[1]
        table.remove(exeque, 1)
    elseif (#ttbl == 0) then
        tmr.stop(timer.id)
        timer.enable = false
    end

    if (tobj ~= nil) then -- Re-insert the repeatable tobj to table
        if (tobj.rp > 0) then
            tobj.delay = tobj.rp
            if (tobj.delay <= tick) then table.insert(exeque, tobj)
            else table.insert(ttbl, tobj)
            end
        end
        local status, err = pcall(tobj.f, unpack(tobj.argus))
        if not (status) then print("Task execution fails: " .. tostring(err)) end
    end
    lock = false
end

function timer.start()
        tmr.alarm(timer.id, 2, 1, checkloops)   -- tid = 6, intvl = 2ms, repeat = 1
        timer.enable = true
end

function timer.stop()
    tmr.stop(timer.id)
    timer.enable = false
    _exequeImmed = rmEntry(_exequeImmed, function (v) return v ~= nil end)
    exequeImmed = rmEntry(exequeImmed, function (v) return v ~= nil end)
    exeque = rmEntry(exeque, function (v) return v ~= nil end)
    ttbl = rmEntry(ttbl, function (v) return v ~= nil end)
end

function timer.setTimeout(fn, delay, ...)
    local tobj = { delay = delay, f = fn, rp = 0, argus = {...} }
    if (delay <= tick or delay > 2147483646) then
        tobj.delay = tick
        table.insert(exeque, tobj)
    else
        table.insert(ttbl, tobj)
    end
    if (timer.enable == false) then timer.start() end
    return tobj
end

function timer.setInterval(fn, delay, ...)
    local tobj = timer.setTimeout(fn, delay, ...)
    tobj.rp = delay
    if (timer.enable == false) then timer.start() end
    return tobj
end

return timer
