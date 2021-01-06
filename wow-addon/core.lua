local name, CraftingProfitCalculator_data_NS = ...

local CraftingProfitCalculator_data_ = {}
CraftingProfitCalculator_data_NS.Addon = CraftingProfitCalculator_data_

local CraftingProfitCalculator_data = CraftingProfitCalculator_data_NS.Addon

CraftingProfitCalculator_data.debug_level = 10
CraftingProfitCalculator_data.debug_printing = true
function CraftingProfitCalculator_data:Debug (str, ...)
    if self.debug_printing == true then
        if ... then str = str:format(...) end
        DEFAULT_CHAT_FRAME:AddMessage(("Addon: %s"):format(str));
    end
end

CraftingProfitCalculator_data.state = {}

CraftingProfitCalculator_data.event_frame = CreateFrame("Frame")

-- Register for events
CraftingProfitCalculator_data.event_frame:RegisterEvent("ADDON_LOADED")
CraftingProfitCalculator_data.event_frame:RegisterEvent("ADDONS_UNLOADING")

 -- https://wowwiki.fandom.com/wiki/World_of_Warcraft_API#Inventory
 -- https://wowwiki.fandom.com/wiki/World_of_Warcraft_API#Container_.2F_Bag
 -- https://wowwiki.fandom.com/wiki/BagId
 -- https://wowwiki.fandom.com/wiki/World_of_Warcraft_API#Bank
 -- https://github.com/tomrus88/BlizzardInterfaceCode/blob/master/Interface/FrameXML/Constants.lua
 
 function CraftingProfitCalculator_data:init()
	 SLASH_CPC1 = "/cpc"
	 SlashCmdList["CPC"] = function(msg)
		 CraftingProfitCalculator_data:run()
	 end 
 end
 
 function CraftingProfitCalculator_data:run()
	  CraftingProfitCalculator_data:Debug( 'Scanning bags and banks' )
	  local inventory = {}
	 -- Check Backpack and Bank bags
	 for bag = BACKPACK_CONTAINER, (NUM_BAG_SLOTS + NUM_BANKBAGSLOTS), 1
	 do
		 slotCount = CraftingProfitCalculator_data:getBagSlotCount(bag)
		 CraftingProfitCalculator_data:Debug('Bag: ' .. bag .. ' has ' .. slotCount .. ' slots.')
		 for slot = 1, slotCount, 1
		 do
			 itemID, itemCount = CraftingProfitCalculator_data:getBagSlotItem(bag,slot)
			 if itemID ~= nil then
				 if inventory[itemID] == nil then
					 inventory[itemID] = 0
				 end
				 inventory[itemID] = inventory[itemID] + itemCount
			 end
		 end
	 end
	 -- Check Primary Bank
	CraftingProfitCalculator_data:Debug('Bank has ' .. CraftingProfitCalculator_data:getBagSlotCount(BANK_CONTAINER) .. ' slots.')
 slotCount = CraftingProfitCalculator_data:getBagSlotCount(BANK_CONTAINER)
 CraftingProfitCalculator_data:Debug('Bag: ' .. BANK_CONTAINER .. ' has ' .. slotCount .. ' slots.')
 for slot = 1, slotCount, 1
 do
	 itemID, itemCount = CraftingProfitCalculator_data:getBagSlotItem(BANK_CONTAINER,slot)
	 if itemID ~= nil then
		 if inventory[itemID] == nil then
			 inventory[itemID] = 0
		 end
		 GetRealmID()[itemID] = inventory[itemID] + itemCount
	 end
 end
	 -- Check Reagentbank
	 CraftingProfitCalculator_data:Debug('Reagentbank has ' .. CraftingProfitCalculator_data:getBagSlotCount(REAGENTBANK_CONTAINER) .. ' slots.')
	 slotCount = CraftingProfitCalculator_data:getBagSlotCount(REAGENTBANK_CONTAINER)
	 CraftingProfitCalculator_data:Debug('Bag: ' .. REAGENTBANK_CONTAINER .. ' has ' .. slotCount .. ' slots.')
	 for slot = 1, slotCount, 1
	 do
		 itemID, itemCount = CraftingProfitCalculator_data:getBagSlotItem(REAGENTBANK_CONTAINER,slot)
		 if itemID ~= nil then
			 if inventory[itemID] == nil then
				 inventory[itemID] = 0
			 end
			 inventory[itemID] = inventory[itemID] + itemCount
		 end
	 end
	 prof1, prof2, archaeology, fishing, cooking = GetProfessions()
	 professions = {prof1, prof2}

	 realm = {}
	 realm['region_id'] = GetCurrentRegion()
	 realm['region_name'] = GetCurrentRegionName()
	 realm['realm_id'] = GetRealmID()
	 realm['realm_name'] = GetRealmName()
	 
	 return_data = {}
	 return_data['inventory'] = inventory
	 return_data['professions'] = professions
	 return_data['realm'] = realm
	 
	 local playerName, rlmn = UnitName("player")
	 CraftingProfitCalculator_dataDB[playerName .. '-' .. rlmn] = return_data
	 
	 CraftingProfitCalculator_data:Debug('make json')
	 json_data = CraftingProfitCalculator_data:makeJSON(return_data)	 
     print( json_data )
 end
 
 function CraftingProfitCalculator_data:makeJSON(character)
	 local str = '{'
	 if character == nil then
		 -- Check everyone
		 data = {}
	 else
		 -- Check one character
		 data = CraftingProfitCalculator_dataDB[character]	 
	 end
	 -- First inventory
	 str = str .. '"inventory": ['
	 for key,value in pairs(data.inventory)
	 do
		 str = str .. '{"id": ' .. key ',"quantity:":'..value'},'
	 end
	 str = str .. '],'
	 -- Professions
	 str = str .. '"professions":['
	 for _, prof in ipairs(data.professions) do
	     str = str .. '"' .. prof .. '",'
	 end
	 str = str .. '],'
	 -- Realm Data
	 str = str .. '"realm":{'
	 str = str .. '"region_id":' .. data.realm['region_id'] .. ','
	 str = str .. '"region_name":"' .. data.realm['region_name'] .. '",'
	 str = str .. '"realm_id":' .. data.realm['realm_id'] .. ','
	 str = str .. '"realm_name":"' .. data.realm['realm_name'] .. '",'
	 str = str .. '},'
	 str = str .. '}'
	 return str
 end
 
 function CraftingProfitCalculator_data:getBagSlotCount(bagid)
	 return GetContainerNumSlots(bagid)
 end
 
 function CraftingProfitCalculator_data:getBagSlotItem(bag,slot)
	 CraftingProfitCalculator_data:Debug('Checking ' .. bag .. ' slot ' .. slot)
	 id = GetContainerItemID(bag,slot)
	 if id ~= nil then
		 CraftingProfitCalculator_data:Debug('bag ' .. bag .. ' slot ' .. slot .. ' has item ' .. GetContainerItemID(bag,slot) .. ' in it')
		 icon, itemCount, locked, quality, readable, lootable, itemLink, isFiltered, noValue, itemID = GetContainerItemInfo(bag, slot)
	 else
		 CraftingProfitCalculator_data:Debug('bag ' .. bag .. ' slot ' .. slot .. ' is empty')
		 itemID = nil
		 itemCount = 0
	 end
	 return itemID, itemCount
 end
 
 function CraftingProfitCalculator_data:teardown()
 end
 
 CraftingProfitCalculator_data.event_frame:SetScript("OnEvent", function(self, event, arg1, ...)
--    CraftingProfitCalculator_data:Debug("Handle " .. event)
    if event == "ADDON_LOADED" and arg1 == "CraftingProfitCalculator_data" then
        -- Our saved variables, if they exist, have been loaded at this point.
        if CraftingProfitCalculator_dataDB == nil then
            -- This is the first time this addon is loaded; set SVs to default values
            CraftingProfitCalculator_dataDB = {}
        end

        CraftingProfitCalculator_data:init()
		
    elseif event == "ADDONS_UNLOADING" then
        CraftingProfitCalculator_data:teardown()
    end
end)