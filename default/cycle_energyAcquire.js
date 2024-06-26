var {getSpawnerRoomIndex} = require("manager_Memory");

function getTarget_miner(creep){
    /*
    . Considers the source this MINER is assigned to (all miners will be assigned)
    . Returns the target location this creep should move to
    . If SOURCE in the same room as this, that is directly the target
    . If SOURCE is in a different room to this, the target should be a route to the next room, that is closer to the target room (multi-room pathing)

    ####
    ## BE AWARE THAT THE 'FAKE' TARGET USED FOR PATHING WITH NO VISION IS IMMITAATING A ROOM OBJECT, SO MAY NOT HAVE ALL THE REQUIRED ATTRIBUTES
    ####
    */
    var target = null;
    if(creep.memory.isMining){  //Mining => want to go to associated source
        var hasVision = Game.rooms[creep.memory.houseKey.roomID];
        if(hasVision){  //=> Can directly set source as target
            target = Game.getObjectById(creep.memory.houseKey.sourceID);
        }
        else{           //=> Will have to path to the room generally to gain vision
            target = {room:{name:creep.memory.houseKey.roomID}, pos:creep.pos.findClosestByPath(creep.room.find(Game.map.findRoute(creep.room.name, creep.memory.houseKey.roomID)[0].exit))};
        }
    }
    else{                       //Depositing => want to deliver to associated container OR spawn (both could be in other rooms => need to vision check)
        var roomIndex   = searchEnergyRooms_roomIndex(creep.memory.houseKey.roomID);
        var sourceIndex = searchEnergyRooms_sourceIndex(roomIndex, creep.memory.houseKey.sourceID);
        var hasGatherers = Memory.energyRooms[roomIndex].sources[sourceIndex].gatherers.length  > 0;
        var hasContainers= Memory.energyRooms[roomIndex].sources[sourceIndex].containers.length > 0;
        var manualDelivery = true;  //Deliver to spawn MANUALLY
        if(hasContainers){
            if(hasGatherers){   //Deliver to containers (may have no vision)
                manualDelivery = false;
                var hasVision  = Game.rooms[creep.memory.houseKey.roomID];                              //## CURRENTLY HAVE TO ASSUME ALL CONTAINERS ARE IN THE ROOM WHERE THE MINING OCCURS ##
                if(hasVision){  //=> Can directly search for and retrieve container
                    var containerObjects = [];
                    //var containerIDs = [];                                                            //To stop reference parsing --> #####LIKELY NOT NEEDED#####
                    //containerIDs = Memory.energyRooms[roomIndex].sources[sourceIndex].containers;     //To stop reference parsing --> #####LIKELY NOT NEEDED#####
                    for(var index in Memory.energyRooms[roomIndex].sources[sourceIndex].containers){
                        containerObjects.push(Game.getObjectById(Memory.energyRooms[roomIndex].sources[sourceIndex].containers[index]));}                //No vision problem as have ASSUMED VISION
                    containerObjects = _.filter(containerObjects, function(obj) { return (obj.store.getFreeCapacity(RESOURCE_ENERGY) > 0) });
                    if(creep.room.name == creep.memory.houseKey.roomID){    //Same room      => direct pathing
                        target = creep.pos.findClosestByPath(containerObjects);}
                    else{                                                   //Different room => indirect pathing (will become direct after)
                        target = containerObjects[0];}
                }
                else{           //=> Will need to path to the room generally to gain vision
                    target = {room:{name:creep.memory.houseKey.roomID}, pos:creep.pos.findClosestByPath(creep.room.find(Game.map.findRoute(creep.room.name, creep.memory.houseKey.roomID)[0].exit))};   //## PATHING TO CONTAINERS, ASSUMED ALL INSIDE ROOM IN QUESTION, => JUST SAME AS PATHING TO SOURCE IN THAT ROOM ##
                }
            }
        }
        if(manualDelivery){     //Deliver to spawn MANUALLY (always vision)
            var deliveryTargets = Game.rooms[creep.memory.spawnKey.roomID].find(FIND_STRUCTURES, {filter : (structure) => {return ((structure.structureType == STRUCTURE_EXTENSION && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0) || (structure.structureType == STRUCTURE_SPAWN && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0))}});
            if(creep.room.name == creep.memory.spawnKey.roomID){        //Same room      => direct pathing
                target = creep.pos.findClosestByPath(deliveryTargets);}
            else{                                                       //Different room => indirect pathing (will become direct after)
                target = deliveryTargets[0];}
        }
    }
    return target;






    /*
    var target = null;
    if(creep.memory.isMining){ //Go to source
        var hasVision = Game.getObjectById(creep.memory.houseKey.sourceID);
        if(hasVision){    //If has VISION
            target = Game.getObjectById(creep.memory.houseKey.sourceID);}
        else{             //If NO VISION
            target = creep.pos.findClosestByPath(creep.room.find(Game.map.findRoute(creep.room.name, creep.memory.houseKey.roomID)[0].exit));
        }
    }
    else{               //Go to closest of spawn, ext or container
        var roomIndex   = searchEnergyRooms_roomIndex(creep.memory.houseKey.roomID);
        var sourceIndex = searchEnergyRooms_sourceIndex(roomIndex, creep.memory.houseKey.sourceID);
        var hasGatherers = Memory.energyRooms[roomIndex].sources[sourceIndex].gatherers.length > 0;
        if(hasGatherers){
            //(1) Try to give to a linked container
            //(2) If no linked containers, then hand deliver
            
            //(1)
            var containerIDs = [];
            containerIDs = Memory.energyRooms[roomIndex].sources[sourceIndex].containers;

            //Outside if, so if there are containers but they are all full he will hand deliver; prevents 0 energy deliver situations (so no 300 energy cap from spawn when spawning new workers)
            var containerObjects = [];
            for(var index in containerIDs){
                containerObjects.push(Game.getObjectById(containerIDs[index]));}
            containerObjects = _.filter(containerObjects, function(obj) { return (obj.store.getFreeCapacity(RESOURCE_ENERGY) > 0) });    //Picks out containers with energy available

            if(containerObjects.length > 0){
                target = creep.pos.findClosestByPath(containerObjects);     //All containers shold be in the same room as the miner
                if(target == null){                                         //But if they arent, or they leave the room, just use the 0th as a fallback
                    target = containerObjects[0];}
            }
            else{
                //(2)
                var possibleTargets = Game.rooms[creep.memory.spawnKey.roomID].find(FIND_STRUCTURES, {filter : (structure) => {return ((structure.structureType == STRUCTURE_EXTENSION && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0) || (structure.structureType == STRUCTURE_SPAWN && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0))}});
                if(creep.room.name == creep.memory.spawnKey.roomID){    //If in spawn room (where resources being delivered), then find closest thing
                    target = creep.pos.findClosestByPath(possibleTargets);}
                else{                                                   //If not in the spawn room, just choose any of them --> Wll re-path properly once they enter the room
                    target = possibleTargets[0];}
            }
        }
        else{
            //(2)
            var possibleTargets = Game.rooms[creep.memory.spawnKey.roomID].find(FIND_STRUCTURES, {filter : (structure) => {return ((structure.structureType == STRUCTURE_EXTENSION && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0) || (structure.structureType == STRUCTURE_SPAWN && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0))}});
            if(creep.room.name == creep.memory.spawnKey.roomID){    //If in spawn room (where resources being delivered), then find closest thing
                target = creep.pos.findClosestByPath(possibleTargets);}
            else{                                                   //If not in the spawn room, just choose any of them --> Wll re-path properly once they enter the room
                target = possibleTargets[0];}
        }
    }
    return target;
    */
}
function getTarget_gatherer(creep){
    /*
    . Considers the source this GATHERER is assigned to (all gatherers will be assigned)
    . Returns the target location this creep should move to
    . If SOURCE in the same room as this, move to containers associated with this source
    . If SOURCE is in a different room to this, the target should be a route to the next room, that is closer to the target room (multi-room pathing)

    ####
    ## BE AWARE THAT THE 'FAKE' TARGET USED FOR PATHING WITH NO VISION IS IMMITAATING A ROOM OBJECT, SO MAY NOT HAVE ALL THE REQUIRED ATTRIBUTES
    ####
    */
    var target = null;
    if(creep.memory.isGathering){  //Gathering => want to go to associated source
        var roomIndex   = searchEnergyRooms_roomIndex(creep.memory.houseKey.roomID);
        var sourceIndex = searchEnergyRooms_sourceIndex(roomIndex, creep.memory.houseKey.sourceID);
        var hasContainers= Memory.energyRooms[roomIndex].sources[sourceIndex].containers.length > 0;
        if(hasContainers){
            var hasVision = Game.rooms[creep.memory.houseKey.roomID];
            if(hasVision){  //=> Can directly search room for containers
                var containerObjects = [];
                //var containerIDs = [];                                                            //To stop reference parsing --> #####LIKELY NOT NEEDED#####
                //containerIDs = Memory.energyRooms[roomIndex].sources[sourceIndex].containers;     //To stop reference parsing --> #####LIKELY NOT NEEDED#####
                for(var index in Memory.energyRooms[roomIndex].sources[sourceIndex].containers){
                    containerObjects.push(Game.getObjectById(Memory.energyRooms[roomIndex].sources[sourceIndex].containers[index]));}                //No vision problem as have ASSUMED VISION
                containerObjects = _.filter(containerObjects, function(obj) { return (obj.store.getUsedCapacity(RESOURCE_ENERGY) > 0) });
                if(creep.room.name == creep.memory.houseKey.roomID){    //Same room      => direct pathing
                    target = creep.pos.findClosestByPath(containerObjects);}
                else{                                                   //Different room => indirect pathing (will become direct after)
                    target = containerObjects[0];}
            }
            else{           //=> Will have to path to the room generally to gain vision
                target = {room:{name:creep.memory.houseKey.roomID}, pos:creep.pos.findClosestByPath(creep.room.find(Game.map.findRoute(creep.room.name, creep.memory.houseKey.roomID)[0].exit))};
            }
        }
        //No containers => do nothing (null target)
    }
    else{                       //Depositing => returning to spawnerRoom => always vision
        //Try find delivery target
        var deliveryTargets = Game.rooms[creep.memory.spawnKey.roomID].find(FIND_STRUCTURES, {filter : (structure) => {return ((structure.structureType == STRUCTURE_EXTENSION && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0) || (structure.structureType == STRUCTURE_SPAWN && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0))}});
        if(deliveryTargets.length == 0){    //If spawner full of energy, give to any terminals in the room
            deliveryTargets = Game.rooms[creep.memory.spawnKey.roomID].find(FIND_STRUCTURES, {filter : (structure) => {return (structure.structureType == STRUCTURE_TERMINAL && structure.store.getUsedCapacity(RESOURCE_ENERGY) <= 150000)}});}
        if(creep.room.name == creep.memory.spawnKey.roomID){        //Same room      => direct pathing
            target = creep.pos.findClosestByPath(deliveryTargets);}
        else{                                                       //Different room => indirect pathing (will become direct after)
            target = deliveryTargets[0];}
    }
    return target;



    /*
    var target = null;
    if(creep.memory.isGathering){ //Go to source
        //(1)
        var containerIDs = [];
        var roomIndex    = searchEnergyRooms_roomIndex(creep.memory.houseKey.roomID);
        var sourceIndex  = searchEnergyRooms_sourceIndex(roomIndex, creep.memory.houseKey.sourceID);
        containerIDs = Memory.energyRooms[roomIndex].sources[sourceIndex].containers;
        //(2)
        var hasVision = Game.getObjectById(Memory.energyRooms[roomIndex].sources[sourceIndex].ID);
        if(hasVision){    //If has VISION
            var containerObjects = [];
            for(var index in containerIDs){
                containerObjects.push(Game.getObjectById(containerIDs[index]));}
            containerObjects = _.filter(containerObjects, function(obj) { return (obj.store.getUsedCapacity(RESOURCE_ENERGY) > 0) });    //Picks out containers with energy available
            target = creep.pos.findClosestByPath(containerObjects);
        }
        else{                                                       //If NOT in the room, DONT search directly (NOT guaranteed vision)
            target = creep.pos.findClosestByPath(creep.room.find(Game.map.findRoute(creep.room.name, creep.memory.houseKey.roomID)[0].exit));
        }
    }
    else{               //Go to closest of spawn, ext or container
        //(2)
        var possibleTargets = Game.rooms[creep.memory.spawnKey.roomID].find(FIND_STRUCTURES, {filter : (structure) => {return ((structure.structureType == STRUCTURE_EXTENSION && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0) || (structure.structureType == STRUCTURE_SPAWN && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0))}});   //Fill spawnerRoom with energy
        if(possibleTargets.length == 0){
            possibleTargets = Game.rooms[creep.memory.spawnKey.roomID].find(FIND_STRUCTURES, {filter : (structure) => {return (structure.structureType == STRUCTURE_TERMINAL && structure.store.getUsedCapacity(RESOURCE_ENERGY) <= 150000)}});}  //Fill terminal with energy
        if(creep.room.name == creep.memory.spawnKey.roomID){    //If in spawn room (where resources being delivered), then find closest thing
            target = creep.pos.findClosestByPath(possibleTargets);}
        else{                                                   //If not in the spawn room, just choose any of them --> Wll re-path properly once they enter the room
            target = possibleTargets[0];}
    }
    return target;
    */
}
function init_energyRoom(room, spawnerRoomID){
    /*
    . Initialises an empty array structure for a new room (if the room is not currently registered)
    . This will allow miners & gatherers to enter this room and be assigned sources, containers, etc
    . All rooms being mined will require one of these structures
    . A given structure can be removed from here using the "removeEnergyRoom()" function

    Structure is as follows;
    {[], []} == spawnerRoom
    (0)Queue of creeps to be spawned
    (1)To Be Assigned Creeps; list of creep NAMES that are required to assigned to their positions, added here when created for a specific role in here
    Creeps will only be spawned when everyone here has been assigned
    
    [ {}, {}, {ID, [{ID, FreeSpace, [], [], []}, ...]}, ... ]
    (1)Room --> roomName in 0th element of corresponding list; e.g {roomName, [source1Data], [source2Data], ...}
        (2)Source Index --> Its ID in 0th element of corresponding list; e.g {SourceID, [containerIDs], [minerIDs], [gathererIDs]}, Indexed as according to FIND_SOURCES index
            (3)Assigned Info --> IDs of objects assigned to this source; e.g {containerID_1} or {minerID_1, minerID_2, minerID_3} or ...
    
    1. Make sure copy doesnt already exist there
    2. If not, then create structure;
    */
    //1
    var copyExists = false;
    for(var roomIndex in Memory.energyRooms){
        if(Memory.energyRooms[roomIndex].ID == room.name){   //ID of room is its roomName here
            copyExists = true;
            break;
        }
    }
    //2
    var thresholdDist_container = 4;    //Within this radius of source => assign this container to this source (container can be assigned to multiple sources, and vice versa)
    if(!copyExists){
        if(Memory.energyRooms){         //Just a double check
            var roomSource_Objects    = room.find(FIND_SOURCES);
            var roomContainer_Objects = room.find(FIND_STRUCTURES, {filter:(structure) => {return (structure.structureType == STRUCTURE_CONTAINER)}});   //# Note here, only recognises containers that exist when the room is initially registered => may want to have a function to update these values periodically
            var sources = [];
            for(var sourceIndex in roomSource_Objects){
                var cSource_ID        = roomSource_Objects[sourceIndex].id;
                var cSource_FreeSpace = getSource_freeSpace(room, roomSource_Objects[sourceIndex]);
                var containerIDs = [];  //Populated below with nearby containers
                var minerIDs     = [];  //These left empty to be populated when spawning
                var gathererIDs  = [];  //"" ""
                for(var containerIndex in roomContainer_Objects){
                    if( roomSource_Objects[sourceIndex].pos.inRangeTo(roomContainer_Objects[containerIndex], thresholdDist_container) ){
                        containerIDs.push(roomContainer_Objects[containerIndex].id);
                    }
                }
                sources.push({ID:cSource_ID, free:cSource_FreeSpace, containers:containerIDs, miners:minerIDs, gatherers:gathererIDs});
            }
            Memory.energyRooms.push({ID:room.name, spawnerRoomID:spawnerRoomID, sources:sources});
        }
    }
}
function remove_energyRoom(room){
    /*
    . Removes the given energyRoom from the memory list structure
    . This will prevent miners being smartly assigned sources for the room
    */
    for(var roomIndex in Memory.energyRooms){
        if(Memory.energyRooms[roomIndex].ID == room.name){   //ID of room is its roomName here
            Memory.energyRooms.splice(roomIndex,1);
            break;
        }
    }
}
function removeCreep_energyRooms(houseKey, creepRole, creepID){
    /*
    Takes a creep and removes them from all relevent lists 
    in the energyRooms global memory

    #######################################################################
    ## REWORK TO DO THIS RECCURSIVELY, WOULD BE CLEANER AND MORE GENERAL ##
    #######################################################################
    */
    var roomIndex   = searchEnergyRooms_roomIndex(houseKey.roomID);
    var sourceIndex = searchEnergyRooms_sourceIndex(roomIndex, houseKey.sourceID); //# Note the break later assumes that the creep is only assigned to 1 source, and therefore only 1 room
    if(creepRole == "Miner"){
        for(var creepIndex in Memory.energyRooms[roomIndex].sources[sourceIndex].miners){
            if(creepID == Memory.energyRooms[roomIndex].sources[sourceIndex].miners[creepIndex]){
                //console.log("--Miner JUST removed");
                Memory.energyRooms[roomIndex].sources[sourceIndex].miners.splice(creepIndex,1);
                break;
            }
        }
    }
    if(creepRole == "Gatherer"){
        for(var creepIndex in Memory.energyRooms[roomIndex].sources[sourceIndex].gatherers){
            if(creepID == Memory.energyRooms[roomIndex].sources[sourceIndex].gatherers[creepIndex]){
                //console.log("--Gatherer JUST removed");
                Memory.energyRooms[roomIndex].sources[sourceIndex].gatherers.splice(creepIndex,1);
                break;
            }
        }
    }
    //... -> If more roles become involved in energyRooms
}
function searchEnergyRooms_roomIndex(roomID){
    var index = null;
    for(var roomIndex in Memory.energyRooms){
        if(roomID == Memory.energyRooms[roomIndex].ID){
            index = roomIndex;
            break;
        }
    }
    return index;
}
function searchEnergyRooms_sourceIndex(roomIndex, sourceID){
    var index = null;
    for(var sourceIndex in Memory.energyRooms[roomIndex].sources){
        if(sourceID == Memory.energyRooms[roomIndex].sources[sourceIndex].ID){
            index = sourceIndex;
            break;
        }
    }
    return index;
}
function getSource_freeSpace(room, cSource){
    /*
    . Finds the number of free spaces around a source
    . ### This can be improved to make sure all the spaces found can be pathed to ### <------------
    */
    var totalFreeTiles = 0;
    //For 3x3 tiles around this source
    for(var j=cSource.pos.y-1; j<=cSource.pos.y+1; j++){
        for(var i=cSource.pos.x-1; i<=cSource.pos.x+1; i++){
            if( (Game.map.getRoomTerrain(room.name).get(i,j) == 0) || (Game.map.getRoomTerrain(room.name).get(i,j) == 2) ){
                totalFreeTiles++;
            }
        }
    }
    return totalFreeTiles;
}
function updateContainers_energyRooms(){
    /*
    -- Run this periodically, not too often
    . Checks all sources of all energy rooms
    . Removes old containers (that have been destroyed since)
    . Adds new containers that have been added since
    */
    var thresholdDist_container = 4;
    for(var roomIndex in Memory.energyRooms){                               //For each energy room
        for(var sourceIndex in Memory.energyRooms[roomIndex].sources){      //For each source
            var hasVision = Game.rooms[Memory.energyRooms[roomIndex].ID];   //No vision => no update
            if(hasVision){
                var sourceObject   = Game.getObjectById(Memory.energyRooms[roomIndex].sources[sourceIndex].ID);
                var roomContainers = Game.rooms[Memory.energyRooms[roomIndex].ID].find(FIND_STRUCTURES, {filter:(structure) => {return(structure.structureType == STRUCTURE_CONTAINER)}}); //List all containers in given room
                var containerIDs   = [];
                for(var containerIndex in roomContainers){
                    if( sourceObject.pos.inRangeTo(roomContainers[containerIndex], thresholdDist_container) ){
                        containerIDs.push(roomContainers[containerIndex].id);
                    }
                }
                Memory.energyRooms[roomIndex].sources[sourceIndex].containers = containerIDs;    //Replace old list with this
            }
        }
    }
}
function queueCreeps_energyRooms(){
    /*
    -- Call this periodically or continually
    . Checks through energyRoom data for unsaturation
    . Calculates the type of creep (role, parts, etc) needed to satisfy this condition
    . Adds required creeps to the spawn queue (Note, when checking, it will add miners before gatherers, which is good behaviour)

    -- This function will only assign the first unit it finds that is required
    -- It is then called often by the respawn manager to populate all required units

    The spawnerRoom.queue      HOLDS [{roomID, sourceID, Parts, Role}, {...}, ...] <-- Specify what creeps to make                 <-*Only THIS list is touched here*
    The spawnerRoom.unassigned HOLDS [creepNames, ...]                             <-- Specify the creeps who have just been made
    */
    //Only do this when all unassigned positions have been resolved -> so when choosing new spawns, only have to consider energyRooms, not spawnerRoom.unassigned
    var workerQueued = false;
    for(var roomIndex in Memory.energyRooms){
        for(var sourceIndex in Memory.energyRooms[roomIndex].sources){
            //Check mining is saturated
            var saturationCondition_miners = getSaturationCondition_miners(Memory.energyRooms[roomIndex].spawnerRoomID, Memory.energyRooms[roomIndex].sources[sourceIndex]);    //Check mining is saturated
            if(saturationCondition_miners != null){     //Not saturated => put new miners into the queue
                //miner_tasks.queue(Memory.energyRooms[roomIndex].ID, Memory.energyRooms[roomIndex].sources[sourceIndex].ID, saturationCondition_miners.parts);         //#### RESULTS IN CIRCULARNESS
                var creepSpec = {roomID:Memory.energyRooms[roomIndex].ID, sourceID:Memory.energyRooms[roomIndex].sources[sourceIndex].ID, parts:saturationCondition_miners.parts, role:"Miner", time:Game.time};
                Memory.spawnerRooms[getSpawnerRoomIndex(Memory.energyRooms[roomIndex].spawnerRoomID)].queue.push(creepSpec);
                workerQueued = true;
            }
            //Check gathering is saturated
            var saturationCondition_gatherers = getSaturationCondition_gatherers(Memory.energyRooms[roomIndex].spawnerRoomID, Memory.energyRooms[roomIndex].sources[sourceIndex]);   //Check gatherers are saturated
            if(saturationCondition_gatherers != null){                                                                              //Not saturated => put new gatherers into the queue
                //gatherer_tasks.queue(Memory.energyRooms[roomIndex].ID, Memory.energyRooms[roomIndex].sources[sourceIndex].ID, saturationCondition_gatherers.parts);   //#### RESULTS IN CIRCULARNESS
                var creepSpec = {roomID:Memory.energyRooms[roomIndex].ID, sourceID:Memory.energyRooms[roomIndex].sources[sourceIndex].ID, parts:saturationCondition_gatherers.parts, role:"Gatherer", time:Game.time};
                Memory.spawnerRooms[getSpawnerRoomIndex(Memory.energyRooms[roomIndex].spawnerRoomID)].queue.push(creepSpec);
                workerQueued = true;
            }
            //...

            if(workerQueued){
                break;}
        }
        if(workerQueued){
            break;}
    }
}
function getSaturationCondition_miners(roomID, energyRooms_info){
    /*
    . Checks if the miners are saturated
    . If they are NOT, returns what the next miner parts should be in order to fulfil saturation
    . If they are, returns null

    ---> roomID refers to the ID of the SPAWNER room

    The number of parts assigned to the next worker is based on (1)the number of spaces around the source to mine from, 
    (2)the amount of WORK already at source, and (3)the largest amount of energy that could be spent on a creep

    --> Note; Related to "energyMax", if miners do not deliver to extensions, then there will always be a cap a 300, or else the colony could fail if all gatherers die at once
            This is currently fixed by letting miners walk to spawns or ext. when their containers are full, however this means if gathering is not efficient, mining will not 
            be either (as they are leaving their post)
    */
    var condition = null;
    //(1) If any spaces free for a worker
    if(energyRooms_info.free > energyRooms_info.miners.length){
        if( (energyRooms_info.miners.length == 0) && (energyRooms_info.free > 1) ){    //Start off each source (that can hold more than 1 miner) with an always affordable miner
            condition = {parts:[WORK,CARRY,MOVE]};  //Cheapest miner
        }
        else{
            //(2) Sum WORK parts assigned to source
            var workRequired    = 5+1;                      //Work required to full deplete any source  +1 for extra wiggle room (moving etc)
            var total_workParts = 0;
            for(var minerIndex in energyRooms_info.miners){
                total_workParts += _.filter(Game.getObjectById(energyRooms_info.miners[minerIndex]).body, function(part){return (part.type==WORK)}).length;}
            var workNeeded = workRequired -total_workParts;
            if(workNeeded > 0){                             //If actually need any more workers
                //(3) Energy max
                var energyMax = Game.rooms[roomID].energyCapacityAvailable; //#### THIS WILL HAVE TO TAKE A READING FROM THE ROOM, FROM ROOMINDEX, IN MULTI ROOM CASE ####
                //Now make decision
                var workNeeded_perWorker = Math.ceil(workNeeded / (energyRooms_info.free -energyRooms_info.miners.length)); //Spreads work over spaces possible to be mined ==> This is probably not a good way to do this for larger bases, but overall should improve flowrate of energy (e.g no sudden spikes of nothing when they die of old age)
                var partSet = [CARRY,MOVE];
                for(var i=0; i<workNeeded_perWorker; i++){          //Attempts to spawn the most expensive (but not overkill) miner it can => however need to still have cheap miner above as extensions imply unreachable goals GIVEN you have 0 miners, => have to fullly rely on passive income
                    partSet.unshift(WORK);
                    var energyCost = _.sum(partSet, part => BODYPART_COST[part]);
                    if(energyCost > energyMax){
                        partSet.shift();
                        break;}
                }
                condition = {parts:partSet};    //... Could add more returns for a condition if needed
            }
        }
    }
    return condition;
}
function getSaturationCondition_gatherers(roomID, energyRooms_info){
    /*
    . Checks if the gatherers are saturated
    . If they are NOT, returns what the next gatherer parts should be in order to fulfil saturation
    . If they are, returns null

    The number of parts assigned to the next worker is based on (1)if containers exist to gather from and (2)the distance to the source

    --> Note; Related to "energyMax", make sure a cheap gatherer is spawned if no others are there to ensure some gathering always takes 
            place, so miners can work efficiently, and gatherers are never falsely valued too highly so they never spawn (due to extensions)
    */
    var condition = null;
    if(energyRooms_info.containers.length > 0){
        if(energyRooms_info.gatherers.length == 0){         //If this is the first gatherer, make them cheap so gathering will occur
            condition = {parts:[CARRY,MOVE,CARRY,MOVE]};
        }
        else{
            //(1) Sum CARRY parts assigned to source
            /*
            var originObj = Game.rooms[roomID].find(FIND_STRUCTURES, {filter:(structure)=>{return ( structure.structureType == STRUCTURE_SPAWN )}})[0].pos;
            var goalObj   = {pos:Game.getObjectById(energyRooms_info.ID).pos, range:1};
            var travelDistance   = PathFinder.search(originObj, goalObj).path.length +8;   //From spawn to source, actual path +8 to account for getting stuck in motion, increasing time
            travelDistance = Math.min(travelDistance, 40);   //--> Caps the total distance a source is imagined to be, prevents 20 gatherers for a spawn 1 room away
            var carryRequired    = Math.max(Math.ceil(0.4*travelDistance), 3);             //CARRY required to fully empty whatever a source produces (10 energy tick^-1) --> assumed travelling always at 1 tile tick^-1 --> sets a min so incorrect linear dist is slightly corrected
            */
            var carryRequired    = 15;  //Fixed amount used here for simplicity in multi-room case --> Vision problems
            var total_carryParts = 0;
            for(var gathererIndex in energyRooms_info.gatherers){
                //###############################################################################
                //## ISSUE IN SIM --> GETTING NULL HERE FOR      Game.getObjectById(energyRooms_info.gatherers[gathererIndex])     WHEN THE CREEP IS SPAWNING
                //###############################################################################
                total_carryParts += _.filter(Game.getObjectById(energyRooms_info.gatherers[gathererIndex]).body, function(part){return (part.type==CARRY)}).length;}
            var carryNeeded = carryRequired -total_carryParts;
            if(carryNeeded > 0){          //If actually need any more workers
                //(3) Energy max
                var energyMax = Game.rooms[roomID].energyCapacityAvailable; //#### THIS WILL HAVE TO TAKE A READING FROM THE ROOM, FROM ROOMINDEX, IN MULTI ROOM CASE ####
                //Now make decision
                var carryNeeded_perWorker = Math.ceil(carryNeeded / Math.abs(3.0 -energyRooms_info.gatherers.length));   //Spreads work over multiple gatherers, not all on just one (3 workers used here)
                var partSet = [CARRY,MOVE];
                var partMax = 5;    //Max 3 sets of each => 3+initial = 4 full pairs 
                for(var i=0; i<carryNeeded_perWorker; i++){                     //Attempts to spawn the most expensive (but not overkill) miner it can => however need to still have cheap miner above as extensions imply unreachable goals GIVEN you have 0 miners, => have to fullly rely on passive income
                    partSet.unshift(MOVE);                                      //MOVES made alongside CARRYs to ensure they stay at max move speed (on regular ground)
                    partSet.unshift(CARRY);
                    var energyCost = _.sum(partSet, part => BODYPART_COST[part]);
                    if(energyCost > energyMax){
                        partSet.shift();
                        partSet.shift();
                        break;}
                    if(i >= partMax-1){
                        break;}
                }
                condition = {parts:partSet};    //... Could add more returns for a condition if needed
            }
        }
    }
    return condition;
}
function assignCreeps_energyRooms(){
    /*
    --- Applies to all spawner rooms
    -- Call this function continually
    . spawnerRoom = roomName of home for this creep
    . Looks through 0th unassigned creeps
    . Waits until they are alive (so their ID is available)
    . Then goes to their houseKey and leaves their ID in the energyRooms global memory (so they are assigned/registered)
    */
    for(var spawnerIndex in Memory.spawnerRooms){
        var spawnerRoomID = Memory.spawnerRooms[spawnerIndex].roomID;
        var unassignedLength = Memory.spawnerRooms[getSpawnerRoomIndex(spawnerRoomID)].unassigned.length;
        for(var i=0; i<unassignedLength; i++){
            var creepName = Memory.spawnerRooms[getSpawnerRoomIndex(spawnerRoomID)].unassigned[0];
            if(Memory.creeps[creepName]){   //Prevents a bug where the 1 time a creep, in sim, spawned with undefined memory => ignore his assignment and execute him
                var roomIndex    = searchEnergyRooms_roomIndex(Memory.creeps[creepName].houseKey.roomID);
                var sourceIndex  = searchEnergyRooms_sourceIndex(roomIndex, Memory.creeps[creepName].houseKey.sourceID);
                if(Memory.creeps[creepName].role == "Miner"){
                    Memory.energyRooms[roomIndex].sources[sourceIndex].miners.push(Game.creeps[creepName].id);  //Assigned it correctly
                    Memory.spawnerRooms[getSpawnerRoomIndex(spawnerRoomID)].unassigned.shift();                    //Now it must be removed from this "waiting list"
                }
                if(Memory.creeps[creepName].role == "Gatherer"){
                    Memory.energyRooms[roomIndex].sources[sourceIndex].gatherers.push(Game.creeps[creepName].id);
                    Memory.spawnerRooms[getSpawnerRoomIndex(spawnerRoomID)].unassigned.shift();
                }
                //...
            }
            else{
                //Game.creeps[creepName].suicide();       //May bug out if he is still spawning
                Memory.spawnerRooms[getSpawnerRoomIndex(spawnerRoomID)].unassigned.shift();
            }
        }
    }
}
function clearSpawnerRoom_queue(roomID){
    Memory.spawnerRooms[getSpawnerRoomIndex(roomID)].queue = [];
}
function clearSpawnerRoom_unassigned(roomID){
    Memory.spawnerRooms[getSpawnerRoomIndex(roomID)].unassigned = [];
}

module.exports = {
    getTarget_miner,
    getTarget_gatherer,
    init_energyRoom,
    removeCreep_energyRooms,
    queueCreeps_energyRooms,
    updateContainers_energyRooms,
    assignCreeps_energyRooms};