const express = require("express");
const bodyParser = require("body-parser");
const expressjwt = require("express-jwt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bcrypt = require("bcrypt");
const mysql = require("mysql");

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "jwt"
});

const {
  AuthMiddleware
} = require("./auth.middleware");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
const SECRET = "test";
const jwtcheck = expressjwt({
  secret: "test"
});
app.use(cors());

app.get("/resource", (req, res) => {
  res.status(200).send("Public resource, you can see this");
});
app.get("/resource/secret", AuthMiddleware, (req, res) => {
  res.status(200).send("Secret resource, you should be logged in to see this");
});

app.post("/register", (req, res) => {
  const {
    email,
    password
  } = req.body;

  pool.getConnection((err, connection) => {
    connection.query(
      `SELECT email, password FROM users WHERE email="${email}"`,
      (er, rows) => {
        if (er) throw er;
        else {
          if (!rows.length) {
            pool.getConnection((er, connect) => {
              connect.query(
                `INSERT INTO users (email, password) VALUES ("${email}", "${password}")`,
                (error, result) => {
                  if (error) throw error;
                  else {
                    return res.status(200).send("Вітаю, ви зареєстровані!");
                  }
                }
              );
              connect.release();
            });
          } else {
            return res.send("Ви уже були зареєстровані раніше");
          }
        }
      }
    );
    connection.release();
  });
});
app.get("/verify", async (req, res) => {
  const headers = req.headers.authorization;
  const token = headers.replace("Bearer ", "");

  if (token == "") {
    return res.send({
      status: 'error',
      payload: {
        message: "not auth"
      }
    });
  }
  try {
    const obj = jwt.verify(token, SECRET);
    return res.status(200).send({
      status: "ok",
      payload: {
        ...obj
      }
    });
  } catch (err) {
    return res.status(401).send({
      status: 'error',
      payload: {
        message: "bad token"
      }
    });
  }


});

app.post("/login", (req, res) => {
  const {
    email,
    password
  } = req.body;
  console.log(req.body.password);
  pool.getConnection((err, connection) => {
    connection.query(
      `SELECT * FROM users WHERE email="${email}"`,
      (er, rows) => {
        if (er) throw er;
        else {
          if (!rows) {
            return res.status(401).send("Користувач не знайдений");
          } else {
            if (rows[0].password === req.body.password) {
              const token = jwt.sign({
                  email: rows[0].email
                },
                "test", {
                  expiresIn: 86400
                }
              );
              return res.status(200).send({
                access_token: "Bearer " + token
              });
            } else {
              return res.status(401).send("Користувач не знайдений");
            }
          }
        }
      }
    );

    connection.release();
  });
});

app.get("/status", (req, res) => {
  const localtime = new Date().toLocaleTimeString();

  res.status(200).send(`Server time is ${localtime}`);
});

app.get("*", (req, res) => {
  {
    res.sendStatus(404);
  }
});
app.listen(PORT, () => {
  console.log(`server is renning on port ${PORT}`);
});