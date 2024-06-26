var {getSpawnerRoomIndex} = require("manager_Memory");

var claimer_tasks = {
    task : function(creep){
        /*
        (1). Path towards (without vision) room controller (roomID & sourceID)
        (2). Continually reserve it
        */
        var atDestination = moveToRoom_visionless(creep);           //Note; Always call this, as it empties memory when in the right room, so still wants to be called
        if(atDestination){
            if(!creep.memory.houseKey.sourceID){    //If creep has not remembered the ID of the controller it will be working on, 
                var controllers = creep.room.find(FIND_STRUCTURES, {filter:(structure) => {return (structure.structureType == STRUCTURE_CONTROLLER)}});
                if(controllers.length > 0){
                    creep.memory.houseKey.sourceID = controllers[0].id;
                }
            }
            else{                                   //If you know your controller, go claim/reserve it
                var controller = Game.getObjectById(creep.memory.houseKey.sourceID);
                var reserveResult = creep.reserveController(controller);
                if(reserveResult == ERR_NOT_IN_RANGE){
                    creep.moveTo(controller);
                }
                if(reserveResult == ERR_INVALID_TARGET){    //Means the controller is owned by another player => Dont reserve it, attack it to reduced power faster
                    creep.attackController(controller);     //Note; The invalid range triggers before this error, so will move close by 1st condition, then attack by this condition
                }
            }
        }
    },
    generateCreepParts : function(spawnerRoomID, isCapturer){
        /*
        Looks at the state of the spawner and determines what modules to build on this creep

        ################################################
        ## ALLOW A RESERVER AND A CAPTURER TO BE MADE ## --> CAPTURER MORE MANUAL THAN RESERVER
        ################################################
        */
        var creepParts  = null;
        if(isCapturer){
            //#####################
            //## NOT IMPLEMENTED ##
            //#####################
            //pass
        }
        else{
            //Basic claimer -> Should never really get more complex
            //creepParts = [CLAIM, MOVE];   //--> Holds reserved, but never has build-up => open once they die
            creepParts = [CLAIM, MOVE, CLAIM, MOVE];
        }
        return creepParts;
    },
    queue : function(spawnerRoomID, roomID, sourceID, parts){
        //Note; Have null for houseKey information as this is irrelevent to them
        var creepSpec = {roomID:roomID, sourceID:sourceID, parts:parts, role:"Claimer", time:Game.time};
        Memory.spawnerRooms[getSpawnerRoomIndex(spawnerRoomID)].queue.push(creepSpec);
    },
    respawn : function(creepName, spawnerID, creepSpec){
        var spawner   = Game.getObjectById(spawnerID);
        var houseKey  = {roomID:creepSpec.roomID , sourceID:creepSpec.sourceID};
        var spawnKey  = {roomID:spawner.room.name, spawnID:spawnerID};
        spawner.spawnCreep(creepSpec.parts, creepName, {memory:{role:creepSpec.role, spawnKey:spawnKey, houseKey:houseKey}});
    },
    death : function(){
        /*
        . Death task to perform
        . Removes itself from relevent lists

        1. ...
        */
    }
}

function generate_claimer(isCapturer, spawnerRoomID, roomID){
    /*
    -Spawns a new claimer -> Either reserver or capturer
    -The claimer will be working in the "roomID" (name) room if specified, or look for next available space if 'null' is given instead
    -This is a one-time spawn

    (1) Get details for the claimer
    (2) Get creep parts/info & Queue creep up

    ####################################################################
    ####################################################################
    ## CURRENTLY BROKEN --> NOT CHECKING CREEPS OFF THE LIST PROPERLY ##
    ####################################################################
    ####################################################################
    */
    //(1)
    var claimerDetails = null;
    if(roomID){                     //If a room is given, then just send them there
        claimerDetails = {roomID:roomID};}
    else{                           //If not specified, get next available space left open
        claimerDetails = get_claimerRequired();}
    //(2)
    if(claimerDetails){                 //If found somewhere
        if(claimerDetails.roomID){      //(a double check) If there is a room to be worked on, then generate the parts
            var creepParts = claimer_tasks.generateCreepParts(spawnerRoomID, isCapturer);
            claimer_tasks.queue(spawnerRoomID, claimerDetails.roomID, null, creepParts);
        }
        else{
            console.log("Claimer Spawn Error; Null roomID");
        }
    }
}

function get_claimerRequired(){
    /*
    Checks more claimers are required anywhere, and returns where
    (1) Add all room candidates for claiming
    (2) Remove perma claimed rooms (spawner rooms)
    (3) Look through current claimers, cross rooms of requiredRoomIDs list, create a new claimer for an unfulfilled room
    (4) Pick the 0th element as the destination for this new claimer (or leave as null if no elements left -> e.g no claimer needed)
    */
    var claimerDetails  = null;  //Info about where a claimer is needed
    var requiredRoomIDs = [];
    //(1)
    for(var i=0; i<Memory.energyRooms.length; i++){
        requiredRoomIDs.push(Memory.energyRooms[i].ID); //Currently only candidates to consider now are energyRooms
    }
    //...
    //(2)
    for(var i=0; i<Memory.spawnerRooms.length; i++){
        for(var j=requiredRoomIDs.length-1; j>=0; j--){
            //##################################################################
            //#### SET AS FALSE BECAUSE HARD TO CHECK -> WHEN NO VISION ??? ####
            //##################################################################
            var room_permaClaimed = Memory.spawnerRooms[i].roomID == requiredRoomIDs[j];    //e.g is a spawner room owned by you
            var room_ownedByOther = false;                                                  //e.g contains a spawner from another player -> dont waste resources try to reserve it
            if(room_permaClaimed || room_ownedByOther){
                requiredRoomIDs.splice(j,1);    //Remove jth element
                break;  //As each room should only ever occur ONCE
            }
        }
    }
    //...
    //(3)
    for(name in Game.creeps){
        if(Game.creeps[name].memory.role == "Claimer"){
            //Look through all claimers
            for(var i=0; i<requiredRoomIDs.length; i++){
                //Look through all remaining rooms
                if(Game.creeps[name].memory.houseKey.roomID == requiredRoomIDs[i]){
                    requiredRoomIDs.splice(i,1);    //Remove jth element
                    break;  //Then move on, as the room should only occur once here too
                }
            }
        }
    }
    //(4)
    if(requiredRoomIDs.length > 0){
        claimerDetails = {roomID:requiredRoomIDs[0]};
    }
    return claimerDetails;
}

function moveToRoom_visionless(creep){
    var atDestination  = false;
    var inRequiredRoom = (creep.room.name == creep.memory.houseKey.roomID);
    if(inRequiredRoom){
        //(1) Reset routing
        if(creep.memory.travelRoute){           //If you still have a travel route, clear that space
            delete creep.memory.travelRoute;}
        //(2) Do task
        atDestination = true;
        //Nothing required here -> Just moving towards room
    }
    else{   //Move to required room
        if(!creep.memory.travelRoute){                                                               //Create multi-room travel route
            creep.memory.travelRoute = Game.map.findRoute(creep.room.name, creep.memory.houseKey.roomID);}  //
        else{
            if(creep.memory.travelRoute.length == 0){   //Backup precaution
                delete creep.memory.travelRoute;}       //
            else{
                if(creep.room.name == creep.memory.travelRoute[0].room){                                            //Move along travel route to required room
                    creep.memory.travelRoute.shift();}                                                              //
                if(creep.memory.travelRoute.length > 0){                                                            //
                    creep.moveTo(creep.pos.findClosestByPath(creep.room.find(creep.memory.travelRoute[0].exit)));}  //
            }
        }
    }
    return atDestination;
}

function automatic_spawnClaimers(){
    /*
    - Determines when a new claimer should be made
    - Currently only factors in energy room considerations
    */
    if(Memory.energyRooms.length > 0){
        var base_lifeTime = 600/3.0;    //###### CURRENTLY A GUESS ###### -> NUMBER OF TICKS OF LIFE
        //For energy rooms
        var roomsToService = Memory.energyRooms.length - Memory.spawnerRooms.length;    //Non-perma energy rooms
        var adjusted_lifeTime = Math.floor(base_lifeTime/roomsToService);
        if(Game.time % adjusted_lifeTime == 0){
            //################################################################################################
            //## WILL NEED TO CONSIDER EACH SPAWNER --> THE ROOM ASSOCIATED TO AN ENERGY ROOM --> IN FUTURE ##
            //################################################################################################
            generate_claimer(false, Memory.spawnerRooms[0].roomID, null);
        }
    }
}

module.exports = {
    claimer_tasks,
    generate_claimer,
    automatic_spawnClaimers
}