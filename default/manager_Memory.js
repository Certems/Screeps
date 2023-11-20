function manageMemory_energyRooms(){
    //Make sure energyRooms{} exists
    if(!Memory.energyRooms){
        Memory.energyRooms = [];}
    //...
}
function manageMemory_queues(){
    //Make sure Queues{} exist
    if(!Memory.spawnerRooms){
        Memory.spawnerRooms = [];
        init_spawnerRooms("sim");      //#### WILL NEED TO CLEVERLY CHECK WHEN TO MAKE THIS DEPENDING ON WHAT IS BEING ASKED TO BE SPAWNED, NEED TO CHECK IF THIS QUEUE FOR THIS ROOM ALREADY EXISTS
    }

    //Remove old queued creeps --> prevents clogging
    if(Game.time.toString().slice(-1) == 0){                                        //Every 10 frames
        for(var spawnerRoomIndex in Memory.spawnerRooms){
            for(let i=Memory.spawnerRooms[spawnerRoomIndex].queue.length-1; i>=0; i--){
                if(Math.abs(Game.time-Memory.spawnerRooms[spawnerRoomIndex].queue[i].time) >= 100){
                    Memory.spawnerRooms[spawnerRoomIndex].queue.splice(i,1);                            //If has been sat in queue for too long, get rid of it
                }
            }
        }
    }
}
function init_spawnerRooms(roomID){
    /*
    . Creates a space in the "Memory.spawnerRooms" for a spawner in a room not currently assigned
    . If this is left empty for some time, it will be removed
    . Inside a Memory.spawnerRooms element, you have; {roomID, queue, unassigned}
        roomID       = roomName (name)
        queue[{}]    = creeps in queue for that room (list[] of specs{})
        unassigned[] = creeps unassigned for that room (list[] of names)
    */
    var queueSet          = [];
    var unassignedSet     = [];
    var mineralStorageSet = [];   //Stores minerals -> This holds IDs for storages used to hold minerals
    var spawnerRoom_elem  = {roomID:roomID, queue:queueSet, unassigned:unassignedSet, mineralStorage:mineralStorageSet};
    Memory.spawnerRooms.push(spawnerRoom_elem);
}
function getSpawnerRoomIndex(roomID){
    /*
    . Takes a room name, finds the index in the "spawnerRooms" corresponding to it
    */
    var requiredIndex = null;
    for(var spawnerRoomIndex in Memory.spawnerRooms){
        if(Memory.spawnerRooms[spawnerRoomIndex].roomID == roomID){
            requiredIndex = spawnerRoomIndex;
            break;
        }
    }
    return requiredIndex;
}
function manageMemory_towers(){
    //Make sure towers[] exist
    if(!Memory.towers){
        Memory.towers = []; //List of IDs
    }
}

module.exports = {
    getSpawnerRoomIndex,
    manageMemory_energyRooms,
    manageMemory_queues,
    manageMemory_towers
};