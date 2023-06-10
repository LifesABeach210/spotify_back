var express = require("express");
var router = express.Router();
const bcrypt = require("bcryptjs");
const { db } = require("../mongo");
const { uuid } = require("uuidv4");
const jwt = require("jsonwebtoken");
const { startingData } = require("../utils/data");
const e = require("express");
module.exports = {
  createUser: async (req, res) => {
    const { firstName, lastName, email, password } = req.body;

    try {
      const collection = await db().collection("Users");
      const collectionLength = await collection.find({}).length;
      let count = collectionLength;
      const saltRounds = 10;
      const salt = await bcrypt.genSaltSync(saltRounds);
      const hashPassword = await bcrypt.hashSync(password, salt);
      console.log(hashPassword, "hash_Password");

      const userData = {
        firstname: firstName ? firstName : "",
        lastname: lastName ? lastName : "",
        email: email ? email : "",
        password: hashPassword,
        UUID: uuid(),
        ID: count,
        date: new Date().toISOString(),
        playlist: [startingData],
      };

      if (hashPassword) {
        const createUser = await collection.insertOne(userData);
        if (createUser) {
          res.status(200).json({
            success: true,
            message: "User Has Been Added To DataBase",
            data: userData,
          });
        } else {
          res.status(400).json({
            success: false,
            message: "Please Enter A Valid Email and Password",
          });
        }
      }
    } catch (error) {
      res.status(500).json({ success: false, message: error.toString() });
    }
  },

  signIn: async (req, res) => {
    const { email, password } = req.body;

    const collection = await db()
      .collection("Users")
      .findOne({ email: email });

    const compareHash = await bcrypt.compare(
      password,
      collection.password
    );
    try {
      if (collection && compareHash) {
        const payload = {
          firstname: collection.firstname,
          lastname: collection.lastname,
          email: email,
          userId: collection._id,
        };
        const payloadSecure = await jwt.sign(
          {
            exp: Math.floor(Date.now() / 1000) + 60 * 60,
            data: payload,
          },
          process.env.JWT_SECRET_KEY
        );
        console.log(payloadSecure, "token");
        const testPayload = await jwt.decode(payloadSecure);

        if (payloadSecure) {
          const token = payloadSecure;
          res.status(200).json({
            success: true,
            message: "User Logged In",
            token: token,
          });
        }
      }
    } catch (e) {
      res.status(500).json({ success: false, message: e.toString() });
    }
  },
};
