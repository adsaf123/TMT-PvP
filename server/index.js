const express = require("express")
const bodyParser = require("body-parser")
const cors = require("cors")
const app = express()
const port = 5000

app.use(bodyParser.json())
app.use(cors())

const SERVERINFO = {
    PLAYERSETNICK: "playerSetNick",
    PLAYERJOINGAME: "playerJoinGame",
    PLAYERHOSTGAME: "playerHostGame",
    HOSTKICKPLAYER: "hostKickPlayer",
    PLAYERGETGAMEINFO: "playerGetGameInfo",
}

var games = {}
var players = {}

var setPlayerNick = function(playerID, nick) {
    if (players[playerID] == undefined) {
        players[playerID] = {}
    }
    players[playerID].nick = nick
    
    console.log(playerID + " is now " + nick)
}

var playerJoinGame = function(playerID, gameID) {
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
    var i;
    for(i = 0; games[i] !== undefined; i++) {}
    var game = {
        host: playerID,
        hostNick: players[playerID],nick,
        players: [],
        maxPlayers: gameInfo.maxPlayers,
        tree: gameInfo.tree,
    }
    games[i] = game
    return i
}

var playerGetGameInfo = function(playerID) {
    //console.log(`player ${playerID} requested game info`)

    if (players[playerID].game == undefined) {
        return {id: -1}
    } else if (players[playerID].game == -1) {
        return {id: -2}
    } else {
        return games[players[playerID].game]
    }
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
    }
}) 

app.listen(port, function() {
   console.log(`Server running on port ${port}`)
})



