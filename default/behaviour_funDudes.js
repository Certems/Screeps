var funTask = {
    task : function(creep){
        //Run to other base and spam words
        var targetLocation;
        if(creep.room.name == "E53N22"){
            targetLocation = new RoomPosition(6,49,creep.room.name);}
        else{
            targetLocation = new RoomPosition(21,21,creep.room.name);}
        creep.moveTo(targetLocation);
        creep.say('📯📯📯');
    },
    respawn : function(relatedCreepNumber){
        if(relatedCreepNumber < 1){
            var creepName = "The Updog";
            Game.spawns["Spawn1"].spawnCreep([MOVE], creepName, {memory:{role:"BasedIndividual", isTrolling:true}});
        }
    },
    death : function(){
        /*
        . Death task to perform
        . Removes itself from relevent lists

        1. ...
        */
    }
}

module.exports = funTask;