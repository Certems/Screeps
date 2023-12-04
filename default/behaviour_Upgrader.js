var {getSpawnerRoomIndex} = require("manager_Memory");

var upgrading_tasks = {
    task : function(creep){
        if(creep.memory.isUpgrading){
            if(Memory.spawnerRooms[getSpawnerRoomIndex(creep.memory.spawnKey.roomID)].queue.length == 0){    //Only upgrade when no one is being spawned at YOUR spawner, e.g excess energy
                if(creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE){
                    creep.moveTo(creep.room.controller);
                }
            }
            if(creep.store.getUsedCapacity(RESOURCE_ENERGY) == 0){
                creep.memory.isUpgrading = false;
            }
        }
        else{
            if(creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0){
                var energyCaches = creep.room.find(FIND_STRUCTURES, {filter : (structure) => {return ( (structure.structureType == STRUCTURE_SPAWN && structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0) || (structure.structureType == STRUCTURE_EXTENSION && structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0) )}});
                if(creep.room.energyAvailable >= 500){   //If at least 500 total energy available, then take it and use it to upgrade
                    var target = creep.pos.findClosestByPath(energyCaches);
                    if(creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE){
                        creep.moveTo(target);
                    }
                }
                else{
                    //Move out of the way
                    creep.moveTo(creep.room.controller);
                }
            }
            else{
                creep.memory.isUpgrading = true;
            }
        }
    },
    generateCreepParts : function(spawnerRoomID){
        /*
        Looks at the state of the spawner and determines what modules to build on this creep
        */
        var creepParts   = null;
        var creepsOwned  = _.filter(Game.creeps, function(creep) {return (creep.spawnKey.roomID == spawnerRoomID && creep.role == "Upgrader")}); //Owned by this spawner, of this type
        var creepNumberRequired = creepsOwned.length -3;    //<-- Specify the number of creeps wanted here
        if(creepNumberRequired > 0){    //If actually need any more workers
            var workPerCreep = 5;       //A rough Guess at an upper bound/ideal value --> Can make it more sophisticated
            var energyMax = Game.rooms[getSpawnerRoomIndex(spawnerRoomID)].energyCapacityAvailable;
            var partSet = [WORK,CARRY,MOVE,MOVE];   //Base line body parts required
            for(var i=0; i<workPerCreep; i++){      //Attempts to spawn the most expensive (but not overkill) miner it can afford
                partSet.unshift(WORK);
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
        var creepSpec = {roomID:roomID, sourceID:sourceID, parts:parts, role:"Upgrader", time:Game.time};
        Memory.spawnerRooms[getSpawnerRoomIndex(roomID)].queue.push(creepSpec);
    },
    respawn : function(creepName, spawnerID, creepSpec){
        //[WORK, WORK, MOVE, CARRY]
        //var creepName = creepSpec.role+Game.time;
        var spawner   = Game.getObjectById(spawnerID);
        var houseKey  = {roomID:creepSpec.roomID , sourceID:creepSpec.sourceID};
        var spawnKey  = {roomID:spawner.room.name, spawnID:spawnerID};
        spawner.spawnCreep(creepSpec.parts, creepName, {memory:{role:creepSpec.role, spawnKey:spawnKey, houseKey:houseKey, isUpgrading:false}});
    },
    death : function(){
        /*
        . Death task to perform
        . Removes itself from relevent lists

        1. ...
        */
    }
}

module.exports = upgrading_tasks;