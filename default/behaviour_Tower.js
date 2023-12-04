var tower_tasks = {
    task : function(tower){
        var isInvasion = tower.room.find(FIND_HOSTILE_CREEPS);
        if(isInvasion){
            towerAttack_hostileCreeps(tower);}
        else{
            if(tower.store.getUsedCapacity(RESOURCE_ENERGY) >= 0.5*tower.store.getCapacity()){  //Any repair when over half energy, in case of attack
                towerRepair_prioirity(tower);}
            }
    }
};

function towerAttack_hostileCreeps(tower){
    /*
    Attacks the closest enemy creep seen
    . Note;#### this is bad method of defense, the tower should target heals and such, this should be changed ####
    */
    var target = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
    if(target.length > 0){
        if(target){
            tower.attack(target);
        }
    }
}
function towerRepair_prioirity(tower){
    /*
    Repairs everything in the room the tower is located
    Target priority is;
    1. Containers
    2. Turrets
    3. Other not walls
    4. Walls
    */
    var targetsPrio;
    targetsPrio = tower.room.find(FIND_STRUCTURES, {filter : (structure) => {return ( (structure.structureType == STRUCTURE_CONTAINER) && (structure.hits < structure.hitsMax*0.8) )}});
    if(targetsPrio.length == 0){
        targetsPrio = tower.room.find(FIND_STRUCTURES, {filter : (structure) => {return ( (structure.structureType == STRUCTURE_TOWER) && (structure.hits < structure.hitsMax*0.8) )}});
        if(targetsPrio.length == 0){
            targetsPrio = tower.room.find(FIND_STRUCTURES, {filter : (structure) => {return ( (structure.structureType != STRUCTURE_WALL) && (structure.hits < structure.hitsMax*0.8) )}});
            if(targetsPrio.length == 0){
                if(tower.room.energyCapacityAvailable -tower.room.energyAvailable <= 50){   //If loads of spare energy, then do walls                                                                       //Do Walls
                    targetsPrio = tower.room.find(FIND_STRUCTURES, {filter : (structure) => {return ( (structure.structureType == STRUCTURE_WALL) && (structure.hits < structure.hitsMax*0.0001) )}});      // --> Do all walls to a small degree
                    if(targetsPrio.length == 0){                                                                                                                                                            //
                        targetsPrio = tower.room.find(FIND_STRUCTURES, {filter : (structure) => {return ( (structure.structureType == STRUCTURE_WALL) && (structure.hits < structure.hitsMax*0.01) )}});    // --> Do all walls to a larger degree after
                    }
                }
            }
        }
    }
    var target  = creep.pos.findClosestByRange(targetsPrio);
    tower.repair(target);
}

module.exports = {
    tower_tasks
};