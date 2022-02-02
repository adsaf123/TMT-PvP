const SERVERINFO = {
    SERVERIP: "https://TMTPVPServer.adsaf.repl.co",
    PLAYERSETNICK: "playerSetNick",
    PLAYERJOINGAME: "playerJoinGame",
    PLAYERHOSTGAME: "playerHostGame",
    HOSTKICKPLAYER: "hostKickPlayer",
    HOSTSTARTGAME: "hostStartGame"
}

var gamesList = {}
var currentGame = -1
var currentGameData = {}

var startGame = function () {
    sendDataToServer({type: SERVERINFO.HOSTSTARTGAME})
}

var getGameData = function () {
    fetch(`${SERVERINFO.SERVERIP}/gameInfo`).then(function (response) {
        response.json().then(function (data) {
            currentGameData = data
        })
    })
} 

var hostGame = function () {
    fetch(SERVERINFO.SERVERIP, {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            type: SERVERINFO.PLAYERHOSTGAME,
            tree: player["host-game"].selectedTree,
            maxPlayers: player["host-game"].maxPlayers
        })
    })
}

var getGamesFromServer = function () {
    fetch(`${SERVERINFO.SERVERIP}/games`).then(function (response) {
        response.json().then(function (data) {
            gamesList = data
        })
    })
}

var sendDataToServer = function (data) {
    fetch(SERVERINFO.SERVERIP, {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    })
}

var sendNickToServer = function () {
    sendDataToServer({
        type: SERVERINFO.PLAYERSETNICK,
        nick: player["main-menu"].nick
    })
}

var generateGamesList = function () {
    var list = ["column", []]
    for (const [k, v] of Object.entries(gamesList)) {
        list[1].push(["row", []])
        list[1][list[1].length - 1][1].push(["display-text", v.hostNick])
        list[1][list[1].length - 1][1].push(["display-text", v.tree])
        list[1][list[1].length - 1][1].push(["display-text", `${v.players.length}/${v.maxPlayers}`])
        list[1][list[1].length - 1][1].push(["clickable", `jg${k}`])
    }
    return list
}

var generateGamesClickables = function () {
    var clickables = {}
    for (const [k, v] of Object.entries(gamesList)) {
        clickables[`jg${k}`] = {}
        clickables[`jg${k}`].id = `jg${k}`
        clickables[`jg${k}`].layer = "games-list"
        clickables[`jg${k}`].unlocked = function() { return true }
        clickables[`jg${k}`].display = function () { return "join" }
        clickables[`jg${k}`].canClick = function () { return true }
        clickables[`jg${k}`].onClick = function () { joinGame(k); showNavTab("game-lobby") }
        clickables[`jg${k}`].style = { "width": "30px", "height": "30px", "min-height": "30px" }

    }
    return clickables
}

var generateKickClickables = function () {
    var clickables = {}
    if (currentGameData.players == undefined) return clickables
    for (const k of currentGameData.players) {
        clickables[`kp${k.ip}`] = {}
        clickables[`kp${k.ip}`].id = `kp${k.ip}`
        clickables[`kp${k.ip}`].layer = "game-lobby"
        clickables[`kp${k.ip}`].style = { "width": "30px", "height": "30px", "min-height": "30px" }
        clickables[`kp${k.ip}`].unlocked = function() { return true }
        clickables[`kp${k.ip}`].display = function () { return "kick" }
        clickables[`kp${k.ip}`].canClick = function () { return true }
        clickables[`kp${k.ip}`].onClick = function () { sendDataToServer({ type: SERVERINFO.HOSTKICKPLAYER, playerID: k.ip }) }
    }
    clickables["return"] = {
        display() { return "return to menu" },
        canClick() { return true },
        onClick() { showNavTab("games-list") },
        unlocked() { return true },
        id: "return",
        layer: "game-lobby",
    }
    return clickables
}

var joinGame = function (gameID) {
    sendDataToServer({
        type: SERVERINFO.PLAYERJOINGAME,
        gameID: gameID
    })
}