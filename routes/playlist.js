/** @format */

var express = require('express');
var router = express.Router();

const { db } = require('../mongo');
const { uuid } = require('uuidv4');
const jwt = require('jsonwebtoken');

router.get(`/get-playlist`, async (req, res) => {
  try {
    const token = req.headers.authorization;
    console.log(req.headers);

    // const date = req.body.date;
    const ver = await jwt.verify(
      token,
      process.env.JWT_SECRET_KEY
    );

    const collection = await db().collection('playlist');

    const getPlaylist = await collection.findOne({
      user_id: ver.userData.userId,
    });
    console.log(getPlaylist);

    res
      .status(200)
      .json({ success: true, message: getPlaylist });
  } catch (er) {
    res
      .status(500)
      .json({ success: false, message: er.toString() });
    console.error();
  }
});

router.post(`/create-playlist`, async (req, res) => {
  try {
    const playList = req.body.playlist; //[]
    const name = req.body.playListName;
    const token = req.headers.authorization;

    const ver = await jwt.verify(
      token,
      process.env.JWT_SECRET_KEY
    );
    console.log(ver.userData.userId);

    const newPlaylist = {
      playlistName: name,
      createdAt: new Date().toISOString(),
      user_id: ver.userData.userId,
      playlist: playList, // makes into an array---
      uuid: uuid(),
    };
    console.log('newPlaylist', newPlaylist);
    console.log(req.body);

    console.log(ver, 'ver');

    const collection = await db().collection('playlist');

    const data = await collection.insertOne(newPlaylist);

    res.status(200).json({
      success: true,
      message: 'playlist has been updated',
      data: data,
    });
  } catch (e) {
    console.error();
    console.log(e);

    res
      .status(500)
      .json({ success: false, message: e.toString() });
  }
});

module.exports = router;
