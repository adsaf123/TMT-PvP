import express from "express"
import cors from "cors"
import { Server } from "socket.io"

import Decimal from "break_eternity.js"
import { loadMaps } from "./mapsLoader.js"
import { maps } from "./js/maps.js"
import * as TMTtemp from "./js/technical/temp.js"
import * as TMTgame from "./js/game.js"
import * as TMTutils from "./js/utils.js"
import * as TMTeasyAccess from "./js/utils/easyAccess.js"
import * as TMTNumberFormating from "./js/utils/NumberFormating.js"
import * as TMTlayerSupport from "./js/technical/layerSupport.js"

Object.entries(TMTgame).forEach(([k, v]) => global[k] = v)
Object.entries(TMTutils).forEach(([k, v]) => global[k] = v)
Object.entries(TMTeasyAccess).forEach(([k, v]) => global[k] = v)
Object.entries(TMTNumberFormating).forEach(([k, v]) => global[k] = v)
Object.entries(TMTlayerSupport).forEach(([k, v]) => global[k] = v)
Object.entries(TMTtemp).forEach(([k, v]) => global[k] = v)

//import clone from "just-clone" //<- need to add decimals to work
function clone(obj) {
  if (typeof obj == 'function') {
    return obj;
  }
  var result = Array.isArray(obj) ? [] : {};
  for (var key in obj) {
    // include prototype properties
    var value = obj[key];
    var type = {}.toString.call(value).slice(8, -1);
    if (value instanceof Decimal) {
      result[key] = new Decimal(value)
    } else if (type == 'Array' || type == 'Object') {
      result[key] = clone(value);
    } else if (type == 'Date') {
      result[key] = new Date(value.getTime());
    } else if (type == 'RegExp') {
      result[key] = RegExp(value.source, getRegExpFlags(value));
    } else {
      result[key] = value;
    }
  }
  return result;
}

function getRegExpFlags(regExp) {
  if (typeof regExp.source.flags == 'string') {
    return regExp.source.flags;
  } else {
    var flags = [];
    regExp.global && flags.push('g');
    regExp.ignoreCase && flags.push('i');
    regExp.multiline && flags.push('m');
    regExp.sticky && flags.push('y');
    regExp.unicode && flags.push('u');
    return flags.join('');
  }
}

const app = express()
const port = 5000

app.use(express.json())
app.use(cors())

const server = new Server(5000, () => {
    console.log("server started")
})

server.on("connection", (socket) => {
    console.log(`${socket.id} socket connected`)
    socket.on(SERVERINFO.PLAYERSETNICK, (nick) => {
        setPlayerNick(socket.id, nick)
    })
    socket.on(SERVERINFO.PLAYERJOINGAME, (gameID) => {
        playerJoinGame(socket.id, gameID)
    })
    socket.on(SERVERINFO.HOSTSTARTGAME, (gameInfo) => {
        playerHostGame(socket.id, gameInfo)
    })
    socket.on(SERVERINFO.HOSTKICKPLAYER, (playerID) => {
        if (isHost(socket.id)) hostKickPlayer(playerID)
    })
    socket.on(SERVERINFO.HOSTSTARTGAME, (gameID) => {
        if (isHost(socket.id)) beginGame(gameID)
    })
    socket.on(SERVERINFO.PLAYERDOSOMETHING, (what) => {
        playerDoSomething(socket.id, what)
    })
    socket.on(SERVERINFO.PLAYERGETGAMESLIST, () => {
        socket.emit(SERVERINFO.SERVERSENDGAMESLIST, games)
    })
    socket.on(SERVERINFO.PLAYERGETGAMEINFO, () => {
        socket.emit(SERVERINFO.SERVERSENDGAMEINFO, playerGetGameInfo(socket.id))
    })
})

const SERVERINFO = {
    PLAYERSETNICK: "playerSetNick",
    PLAYERJOINGAME: "playerJoinGame",
    PLAYERHOSTGAME: "playerHostGame",
    HOSTKICKPLAYER: "hostKickPlayer",
    HOSTSTARTGAME: "hostStartGame",
    PLAYERDOSOMETHING: "playerDoSomething",
    PLAYERGETGAMESLIST: "playerGetGamesList",
    SERVERSENDGAMESLIST: "serverSendGamesList",
    PLAYERGETGAMEINFO: "playerGetGameInfo",
    SERVERSENDGAMEINFO: "serverSendGameInfo",
}

var runningGames = {}
var games = {}
var players = {}
var lastGameID = 0

var loadedMaps = loadMaps(maps)
global.maxRow = 10 // <- quick fix

var isHost = function(playerID, gameID) {
    return playerID == games[players[playerID]?.game]?.host
}

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
    runningGames[gameID].funcs = clone(loadedMaps[runningGames[gameID].tree].funcs)
    runningGames[gameID].layers = clone(loadedMaps[runningGames[gameID].tree].layers)
    runningGames[gameID].playersStates = {}
    runningGames[gameID].playersTmps = {}
    runningGames[gameID].getPointGen = loadedMaps[runningGames[gameID].tree].getPointGen
    runningGames[gameID].isEndgame = loadedMaps[runningGames[gameID].tree].isEndgame
    runningGames[gameID].canGenPoints = loadedMaps[runningGames[gameID].tree].canGenPoints
    runningGames[gameID].getStartPoints = loadedMaps[runningGames[gameID].tree].getStartPoints
    for (const player of runningGames[gameID].players) {
        runningGames[gameID].playersTmps[player.ip] = clone(loadedMaps[runningGames[gameID].tree].tmp)
        runningGames[gameID].playersStates[player.ip] = clone(loadedMaps[runningGames[gameID].tree].player)
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
        maxPlayers: Math.max(1, gameInfo.maxPlayers),
        tree: gameInfo.tree,
    }
    lastGameID++
    games[lastGameID] = game
    playerJoinGame(playerID, lastGameID)
    return lastGameID
}

var playerGetGameInfo = function(playerID) {
    //console.log(`player ${playerID} requested game info`)

    if (players[playerID]?.game == undefined) {
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
    var ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress 
    res.send(games)
    if (players[ip] == undefined) players[ip] = {}
    players[ip].game = undefined
    //console.log(`list of games sent to ${req.ip}`)
})


app.get("/gameInfo", function(req, res) {
    var ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress 
    res.send(playerGetGameInfo(ip))
})

app.post("/", function(req, res) {
    var ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress 
    if(req.body.type == SERVERINFO.PLAYERSETNICK) {
        setPlayerNick(ip, req.body.nick)
    } else if (req.body.type == SERVERINFO.PLAYERJOINGAME) {
        playerJoinGame(ip, req.body.gameID)
    } else if (req.body.type == SERVERINFO.PLAYERHOSTGAME) {
        playerHostGame(ip, req.body)
    } else if (req.body.type == SERVERINFO.HOSTKICKPLAYER) {
        if (ip == games[players[ip]?.game]?.host) {
            hostKickPlayer(req.body.playerID)
        }
    } else if (req.body.type == SERVERINFO.HOSTSTARTGAME) {
        if (ip == games[players[ip]?.game]?.host)
            beginGame(players[ip].game)
    } else if (req.body.type == SERVERINFO.PLAYERDOSOMETHING) {
        playerDoSomething(ip, req.body.what)
    }
}) 

app.listen(port, function() {
   console.log(`Server running on port ${port}`)
})

global.unl = function (layer) { // <- QUICKFIX
	if (Array.isArray(tmp.ma.canBeMastered)) if (player.ma.selectionActive&&tmp[layer].row<6&&!tmp.ma.canBeMastered.includes(layer)) return false;
	return player[layer].unlocked;
}

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

