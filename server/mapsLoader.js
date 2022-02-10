import { maps } from "./js/maps.js"
import { updateLayers } from "./js/technical/layerSupport.js"
import { setupTemp } from "./js/technical/temp.js"
import { getStartPlayer } from "./js/utils/save.js"

var loadMaps = function (maps) {
    let ret = {}
    for (const map in maps) {
        const [layers, player, tmp, funcs, isEndgame, canGenPoints, getPointsGen, getStartPoints] = getMapDefaultState(map)
        ret[map] = {layers, player, tmp, funcs, isEndgame, canGenPoints, getPointsGen, getStartPoints}
    }
    return ret
}

var getMapDefaultState = function (map) {
    global.isEndgame = maps[map].isEndgame
    global.canGenPoints = maps[map].canGenPoints
    global.getPointsGen = maps[map].getPointsGen
    global.getStartPoints = maps[map].getStartPoints
    global.funcs = {}
    global.tmp = {}
    global.temp = tmp
    global.layers = {...maps[map].layers}
    global.player = getStartPlayer()
    updateLayers()
    setupTemp()
    return [layers, player, tmp, funcs, isEndgame, canGenPoints, getPointsGen, getStartPoints]
}

export { loadMaps }