// Imports
const express = require("express");
const axios = require("axios");
const session = require("express-session");
const bodyparser = require("body-parser");
const querystring = require("querystring");
const path = require("path");
const fs = require("fs");  
const https = require("https");  
const con = require("./connection");
const qs = require("qs");

const universeId = '7011673255';
const robloxUrl = `https://games.roblox.com/v1/games?universeIds=${universeId}`;

// Settings
const app = express();
app.use(
    session({
        secret: "e93c37e75c484121b340c040e1015caae1b9bd38a10508061d759fece838925a",
    })
);

app.use(bodyparser.urlencoded({ urlencoded: true }));
app.engine("html", require("ejs").renderFile);
app.set("view engine", "html");
app.use("/public", express.static(path.join(__dirname, "public")));
app.set("views", path.join(__dirname, "views"));

// Certificados SSL
const options = {
    key: fs.readFileSync('private.key'),   
    cert: fs.readFileSync('certificate.crt'), 
};

// Functions ()
app.get("/api/auth/discord/redirect", async (req, res) => {
    const code = req.query.code;

    if (!code) {
        res.status(400).send({ Status: "Code not found!" });
    }

    try {
        const AuthResponse = await axios.post(
            "https://discord.com/api/oauth2/token",
            querystring.stringify({
                client_id: "1305587256500813824",
                client_secret: "LB9xQEwL4F7_njX5NJ9Q_n_3I1trKwwO",
                grant_type: "authorization_code",
                code,
                redirect_uri: "https://207.231.111.247:5050/api/auth/discord/redirect", // Ajuste conforme necessário
            }),
            {
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
            }
        );

        if (AuthResponse) {
            const AuthToken = AuthResponse.data["access_token"];
            if (AuthResponse) {
                const ClientResponse = await axios.get(
                    "https://discord.com/api/users/@me",
                    {
                        headers: { Authorization: `Bearer ${AuthToken}` },
                    }
                );
                if (ClientResponse) {
                    req.session.logged = true;
                    req.session.token = AuthToken;
                    req.session.username = ClientResponse.data["username"];
                    req.session.gmail = ClientResponse.data["email"];
                    res.render("logged", {
                        username: `(${req.session.username})`,
                        LoginOrLogout: "Logout",
                    });

                    con.connect(function (err) {
                        if (err) throw err;
                        let HaveData = false;
                        try {
                            const sqlRescue = `select * from Vanguard_Data`;
                            con.query(sqlRescue, function (err, result) {
                                if (err) throw err;
                                const data = result;
                                if (data) {
                                    data.forEach((array) => {
                                        if (array["Name"] === req.session.username) {
                                            console.log("Have account registred in data!");
                                            HaveData = true;
                                        }
                                    });
                                }

                                if (!HaveData) {
                                    console.log("Dont have account!");
                                    const sqlSend = `INSERT INTO Vanguard_Data(
                                        Token, Name, UserID, Gmail,
                                        Points, Contributions, Confiscated, Blacklist, 
                                        Reason, Commands, DateCreatedAccount, DateJoinedServer,
                                        BlacklistedDate
                                    )   
                                    VALUES(
                                        '${req.session.token}','${req.session.username
                                        }','${0}','${req.session.gmail}',
                                        '${0}', '${0}', '${0}', '${0}',
                                        '${0}', '${0}', 'None', 'None',
                                        'None'
                                    )`;
                                    con.query(sqlSend, function (err, result) {
                                        if (err) throw err;
                                        console.log("Dados enviados com sucesso!!");
                                    });
                                }
                            });
                        } catch (err) {
                            console.log(err);
                        }
                    });
                }
            }
        }
    } catch (err) {
        console.log(err);
    }
});

app.get("/", async (req, res) => {
    try {
        if (req.session.logged === true) {
            res.render("logged", {
                username: `(${req.session.username})`,
                LoginOrLogout: "Logout",
            });
            console.log(req.session.username);
        } else {
            res.render("index", {
                username: "",
                LoginOrLogout: "Login with Discord",
            });
        }
    } catch (err) {
        console.log(err);
    }
});

app.post("/button-logout", async (req, res) => {
    try {
        if (req.session.logged === true) {
            req.session.logged = undefined;
            req.session.username = undefined;
            req.session.gmail = undefined;
            res.render("index", {
                username: "",
                LoginOrLogout: "Login with Discord",
            });
        }
    } catch (err) {
        console.log(err);
    }
});

app.get('/api/totalvisits', async (req, res) => {
    try {
        const response = await fetch(robloxUrl);
        const data = await response.json();

        if (data.data && data.data[0]) {
            const totalVisits = data.data[0].visits;
            console.log('Total Visits:', totalVisits);

            res.json({ totalVisits });
        } else {
            console.error('Game data not found:', data);
            res.status(404).json({ error: 'Game data not found' });
        }
    } catch (error) {
        console.error('Error fetching game data:', error);
        res.status(500).json({ error: 'Error fetching game data' });
    }
});

app.post("/api/roblox-user", async (req, res) => {
    try {
        const { code } = req.query;
        if (!code) {
            return res.status(400).json({ error: "Authorization code is required" });
        }

        const tokenResponse = await axios.post(
            "https://apis.roblox.com/oauth/v1/token",
            qs.stringify({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: "authorization_code",
                code,
            }),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );

        const { access_token } = tokenResponse.data;

        const userInfoResponse = await axios.get(
            "https://apis.roblox.com/oauth/v1/userinfo",
            {
                headers: { Authorization: `Bearer ${access_token}` },
            }
        );

        const { sub } = userInfoResponse.data;
        return res.json({ message: "User data received", sub });
    } catch (error) {
        console.error(
            "Error:",
            error.response ? error.response.data : error.message
        );
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// Criando o servidor HTTPS
https.createServer(options, app).listen(5050, "207.231.111.247", () => {
    console.log("Server listening securely on port 5050 with HTTPS://207.231.111.247");
});
