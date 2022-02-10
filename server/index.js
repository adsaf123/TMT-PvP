import express from "express"
import cors from "cors"

import { loadMaps } from "./mapsLoader.js"
import { maps } from "./js/maps.js"
import { updateTemp } from "./js/technical/temp.js"
import * as TMTgame from "./js/game.js"
import * as TMTutils from "./js/utils.js"
import * as TMTeasyAccess from "./js/utils/easyAccess.js"

Object.entries(TMTgame).forEach(([k, v]) => global[k] = v)
Object.entries(TMTutils).forEach(([k, v]) => global[k] = v)
Object.entries(TMTeasyAccess).forEach(([k, v]) => global[k] = v)

const app = express()
const port = 5000

app.use(express.json())
app.use(cors())

const SERVERINFO = {
    PLAYERSETNICK: "playerSetNick",
    PLAYERJOINGAME: "playerJoinGame",
    PLAYERHOSTGAME: "playerHostGame",
    HOSTKICKPLAYER: "hostKickPlayer",
    HOSTSTARTGAME: "hostStartGame",
    PLAYERDOSOMETHING: "playerDoSomething"
}

var runningGames = {}
var games = {}
var players = {}
var lastGameID = 0

var loadedMaps = loadMaps(maps)
global.maxRow = 10 // <- quick fix

var beginGame = function (gameID) {
    console.log(`game ${gameID} started`)
    games[gameID].started = true
    runningGames[gameID] = {...games[gameID]}
    delete games[gameID]
    loadGameState(gameID)
}

var loadGameState = function (gameID) {
    console.log(`loading game state for ${gameID}`)
    runningGames[gameID].winners = []
    runningGames[gameID].funcs = {...loadedMaps[runningGames[gameID].tree].funcs}
    runningGames[gameID].layers = {...loadedMaps[runningGames[gameID].tree].layers}
    runningGames[gameID].playersStates = {}
    runningGames[gameID].playersTmps = {}
    runningGames[gameID].getPointGen = loadedMaps[runningGames[gameID].tree].getPointGen
    runningGames[gameID].isEndgame = loadedMaps[runningGames[gameID].tree].isEndgame
    runningGames[gameID].canGenPoints = loadedMaps[runningGames[gameID].tree].canGenPoints
    runningGames[gameID].getStartPoints = loadedMaps[runningGames[gameID].tree].getStartPoints
    for (const player of runningGames[gameID].players) {
        runningGames[gameID].playersStates[player.ip] = structuredClone(loadedMaps[runningGames[gameID].tree].defaultPlayer)
        runningGames[gameID].playersTmps[player.ip] = structuredClone(loadedMaps[runningGames[gameID].tree].tmp)
        runningGames[gameID].playersStates[player.ip].points = runningGames[gameID].getStartPoints()
    }
}

var setPlayerNick = function(playerID, nick) {
    if (players[playerID] == undefined) {
        players[playerID] = {}
    }
    players[playerID].nick = nick
    
    console.log(playerID + " is now " + nick)
}

var playerJoinGame = function(playerID, gameID) {
    if (games[gameID].maxPlayers <= games[gameID].players.length) return
    games[gameID].players.push({ip: playerID, nick: players[playerID].nick})
    players[playerID].game = gameID
    console.log(playerID + " joins " + gameID)
}

var hostKickPlayer = function(playerID) {
    console.log(`player ${playerID} kicked`)
    games[players[playerID].game].players = games[players[playerID].game].players.filter((p) => p.ip != playerID)
    players[playerID].game = -1
}

var playerHostGame = function(playerID, gameInfo) {
    console.log(`player ${playerID} hosts game`)
    var game = {
        started: false,
        host: playerID,
        hostNick: players[playerID].nick,
        players: [],
        maxPlayers: gameInfo.maxPlayers,
        tree: gameInfo.tree,
    }
    lastGameID++
    games[lastGameID] = game
    playerJoinGame(playerID, lastGameID)
    return lastGameID
}

var playerGetGameInfo = function(playerID) {
    //console.log(`player ${playerID} requested game info`)

    if (players[playerID].game == undefined) {
        return {id: -1}
    } else if (players[playerID].game == -1) {
        return {id: -2}
    } else if (games[players[playerID].game] == undefined){
        return {
            playerID: playerID,
            gameState: runningGames[players[playerID].game]
        }
    } else {
        return games[players[playerID].game]
    }
}

var getTMTfunction = function (name) {
    return global[name] // <- funcs are loaded into global object so this should work???
}

var playerDoSomething = function (playerID, what) {
    let gameID = players[playerID].game

    global.player = runningGames[gameID].playersStates[playerID]
    global.tmp = runningGames[gameID].playersTmps[playerID]
    global.temp = tmp
    global.layers = runningGames[gameID].layers
    global.funcs = runningGames[gameID].funcs
    global.isEndgame = runningGames[gameID].isEndgame
    global.getStartPoints = runningGames[gameID].getStartPoints
    global.getPointGen = runningGames[gameID].getPointGen
    global.canGenPoints = runningGames[gameID].canGenPoints

    getTMTfunction(what.name)(what.layer, what.id)
    
}

app.get("/games", function(req, res) {
    res.send(games)
    if (players[req.ip] == undefined) players[req.ip] = {}
    players[req.ip].game = undefined
    //console.log(`list of games sent to ${req.ip}`)
})

app.get("/gameID", function(req, res) {
    res.send(players[req.ip].game)
})

app.get("/gameInfo", function(req, res) {
    res.send(playerGetGameInfo(req.ip))
})

app.post("/", function(req, res) {
    if(req.body.type == SERVERINFO.PLAYERSETNICK) {
        setPlayerNick(req.ip, req.body.nick)
    } else if (req.body.type == SERVERINFO.PLAYERJOINGAME) {
        playerJoinGame(req.ip, req.body.gameID)
    } else if (req.body.type == SERVERINFO.PLAYERHOSTGAME) {
        playerHostGame(req.ip, req.body)
    } else if (req.body.type == SERVERINFO.HOSTKICKPLAYER) {
        if (req.ip == games[players[req.ip].game].host) {
            hostKickPlayer(req.body.playerID)
        }
    } else if (req.body.type == SERVERINFO.HOSTSTARTGAME) {
        if (req.ip == games[players[req.ip].game].host)
            beginGame(players[req.ip].game)
    } else if (req.body.type == SERVERINFO.PLAYERDOSOMETHING) {
        playerDoSomething(req.ip, req.body.what)
    }
}) 

app.listen(port, function() {
   console.log(`Server running on port ${port}`)
})

var ticking = false

var interval = setInterval(function () {
    if (ticking) return 
    ticking = true

    for (const gameID in runningGames) {
        for (const playerID in runningGames[gameID].playersStates) {
            global.player = runningGames[gameID].playersStates[playerID]
            global.tmp = runningGames[gameID].playersTmps[playerID]
            global.temp = tmp
            global.layers = runningGames[gameID].layers
            global.funcs = runningGames[gameID].funcs
            global.isEndgame = runningGames[gameID].isEndgame
            global.getStartPoints = runningGames[gameID].getStartPoints
            global.getPointGen = runningGames[gameID].getPointGen
            global.canGenPoints = runningGames[gameID].canGenPoints

            let now = Date.now()
	        let diff = ((now - player.time) / 1e3) * 10 // <- to not make "idle" game
            player.time = now

            updateTemp()
            gameLoop(diff)

            if (tmp.gameEnded)
                runningGames[gameID].winners.push(playerID)
        }
    }

    ticking = false
}, 50)

