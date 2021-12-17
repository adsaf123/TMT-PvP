const express = require("express")
const cors = require("cors")
const app = express()
const port = 5000

app.use(cors())

app.get("/", function(req, res) {
   res.send("xd")
})

app.listen(port, function() {
   console.log(`Server running on port ${port}`)
})