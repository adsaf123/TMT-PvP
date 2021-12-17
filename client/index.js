document.getElementById("button").onclick = function () {
    fetch("http://127.0.0.1:5000").then(function (response) {
        response.text().then(function (text) {
            document.getElementById("par").textContent = text
        })
    })
}