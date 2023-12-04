var {getSpawnerRoomIndex} = require("manager_Memory");

var extractor_tasks = {
    task : function(creep){
        if(creep.memory.sourceID != "null"){      //If an extractor exists --> source here referes to mineral instead
            var resourceType = Game.getObjectById(creep.memory.houseKey.sourceID).mineralType;
            if(creep.memory.isExtracting){
                var target = Game.getObjectById(creep.memory.houseKey.sourceID);
                if(target.mineralAmount > 0){  //----->Start mining minerals
                    //Go mine from somewhere
                    //####################################################
                    //## MAKE IT WIAT FOR THE COOLDOWN BETWEEN HARVESTS ##
                    //####################################################
                    if(creep.harvest(target, resourceType) == ERR_NOT_IN_RANGE){
                        creep.moveTo(target);
                    }
                }
                else{   //----->Start selling minerals
                    target = Game.getObjectById(Memory.spawnerRooms[getSpawnerRoomIndex(creep.memory.spawnKey.roomID)].mineralStorage[0]);
                    if(creep.withdraw(target, resourceType) == ERR_NOT_IN_RANGE){
                        creep.moveTo(target);
                    }
                }
                if(creep.store.getFreeCapacity(resourceType) == 0){
                    creep.memory.isExtracting = false;
                }
            }
            else{
                var target = Game.getObjectById(creep.memory.houseKey.sourceID);
                if(target.mineralAmount > 0){  //----->Start mining minerals
                    //go deliver somewhere
                    if(Memory.spawnerRooms[getSpawnerRoomIndex(creep.memory.spawnKey.roomID)].mineralStorage.length > 0){
                        target = Game.getObjectById(Memory.spawnerRooms[getSpawnerRoomIndex(creep.memory.spawnKey.roomID)].mineralStorage[0]);
                        if(creep.transfer(target, resourceType) == ERR_NOT_IN_RANGE){
                            creep.moveTo(target);
                        }
                    }
                }
                else{
                    target = Game.getObjectById("6564e91d3eb96984a8e212a3");
                    if(target){
                        if(creep.transfer(target, RESOURCE_KEANIUM) == ERR_NOT_IN_RANGE){
                            creep.moveTo(target);
                        }
                    }
                }
                if(creep.store.getUsedCapacity(resourceType) == 0){
                    creep.memory.isExtracting = true;
                }
            }
        }
    },
    generateCreepParts : function(spawnerRoomID){
        /*
        Looks at the state of the spawner and determines what modules to build on this creep
        */
        var creepParts   = null;
        var creepsOwned  = _.filter(Game.creeps, function(creep) {return (creep.spawnKey.roomID == spawnerRoomID && creep.role == "Extractor")}); //Owned by this spawner, of this type
        var creepNumberRequired = creepsOwned.length -2;    //<-- Specify the number of creeps wanted here
        if(creepNumberRequired > 0){    //If actually need any more workers
            var workPerCreep = 3;       //A rough Guess at an upper bound/ideal value --> Can make it more sophisticated
            var energyMax = Game.rooms[getSpawnerRoomIndex(spawnerRoomID)].energyCapacityAvailable;
            var partSet = [WORK,CARRY,CARRY,MOVE];            //Base line body parts required
            for(var i=0; i<workPerCreep; i++){  //Attempts to spawn the most expensive (but not overkill) miner it can afford
                partSet.unshift(WORK);
                partSet.unshift(MOVE);
                var energyCost = _.sum(partSet, part => BODYPART_COST[part]);
                if(energyCost > energyMax){
                    partSet.shift();
                    partSet.shift();
                    break;}
            }
            creepParts = partSet;
        }
        return creepParts;
    },
    queue : function(roomID, sourceID, parts){
        //Note; Have null for houseKey information as this is irrelevent to them
        var creepSpec = {roomID:roomID, sourceID:sourceID, parts:parts, role:"Extractor", time:Game.time};
        Memory.spawnerRooms[getSpawnerRoomIndex(roomID)].queue.push(creepSpec);
    },
    respawn : function(creepName, spawnerID, creepSpec){
        var spawner   = Game.getObjectById(spawnerID);
        var houseKey  = {roomID:creepSpec.roomID , sourceID:creepSpec.sourceID};
        var spawnKey  = {roomID:spawner.room.name, spawnID:spawnerID};
        spawner.spawnCreep(creepSpec.parts, creepName, {memory:{role:creepSpec.role, spawnKey:spawnKey, houseKey:houseKey, isExtracting:true}});
    },
    death : function(){
        /*
        . Death task to perform
        . Removes itself from relevent lists

        1. ...
        */
    }
}

function getExtractionID(roomID){
    /*
    . Looks in the room they are spawned for the 1 extractor present
    . Records its ID
    */
    var sourceID = null;
    var extractorsInRoom = Game.rooms[roomID].find(FIND_MINERALS);
    if(extractorsInRoom.length > 0){
        sourceID = extractorsInRoom[0].id;}
    return sourceID;
}

module.exports = extractor_tasks;