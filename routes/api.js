/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

var expect = require('chai').expect;
var ObjectId = require('mongodb').ObjectId;

module.exports = function (app, db) {
  
  app.route('/api/threads/:board')

    .get((req, res) => {
      const board = req.params.board

      if (!board) res.send('missing board information')
      else {
        const collection = db.collection(board)
        collection.find({},{ projection: {
          reported: 0,
          delete_password: 0,
          "replies.delete_password": 0,
          "replies.reported": 0
        }})
          .sort({ bumped_on: -1 })
          .limit(10)
          .toArray((findErr, results) => {
          if (findErr) console.log(`Error loading threads: ${findErr}`)
          const json = results.map(result => {
            result.replycount = result.replies.length
            // ONLY RETURN 3 MOST RECENT REPLIES
            return result
          })
          res.json(json)
        })
      }
    })

    .post((req, res) => {
      const board = req.params.board
      const text = req.body.text
      const delete_password = req.body.delete_password

      if (!board || !text || !delete_password) res.send('missing thread information')
      else {
        const newThread = {
          text: text,
          created_on: new Date(),
          bumped_on: new Date(),
          reported: false,
          delete_password: delete_password,
          replies: []
        }
        const collection = db.collection(board)
        collection.insertOne(newThread, (insertErr, doc) => {
          if (insertErr) console.log(`Error inserting new thread in db: ${insertErr}`)
          newThread._id = doc.ops[0]._id
          res.redirect(`/b/${board}/`)
        })
      }
    })

    .delete((req, res) => {
      const board = req.params.board
      const thread_id = req.body.thread_id
      const delete_password = req.body.delete_password

      if (!board || !thread_id || !delete_password) res.send('missing delete request information')
      else {
        const collection = db.collection(board)
        collection.findOneAndDelete({
          _id: new ObjectId(thread_id),
          delete_password: delete_password
        }, {}, (updateErr, doc) => {
          if (updateErr) console.log(`Error finding and deleting document: ${updateErr}`)
          if (doc.value === null) res.send('incorrect password')
          else res.send('success')
        })
      }
    })

    .put((req, res) => {
      const board = req.params.board
      const thread_id = req.body.thread_id

      if (!board || !thread_id) res.send('missing report request information')
      else {
        const collection = db.collection(board)
        collection.findOneAndUpdate({
          _id: new ObjectId(thread_id),
        }, { $set: {reported: true}}, (updateErr, doc) => {
          if (updateErr) console.log(`Error finding and updating document: ${updateErr}`)
          if (doc.value === null) res.send('incorrect thread id')
          else res.send('success')
        })
      }
    })
    
  app.route('/api/replies/:board')
    
    .get((req, res) => {
      const board = req.params.board
      const thread_id = req.query.thread_id
      
      if (!thread_id) res.send('missing thread ID')
      else {
        const collection = db.collection(board)
        collection.findOne({
          _id: new ObjectId(thread_id)
        }, {
          projection: {
            reported: 0,
            delete_password: 0,
            "replies.delete_password": 0,
            "replies.reported": 0
          }
        }, (findErr, result) => {
            if (findErr) console.log(`Error loading threads and replies: ${findErr}`)
            result.replycount = result.replies.length
            res.json(result)
          })
      }
    })

    .post((req, res) => {
      const board = req.params.board
      const thread_id = req.body.thread_id
      const text = req.body.text
      const delete_password = req.body.delete_password

      console.log(thread_id)

      if (!thread_id || !text || !delete_password) res.send('missing reply information')
      else {
        const newReply = {
          _id: new ObjectId(),
          text: text,
          created_on: new Date(),
          delete_password: delete_password,
          reported: false
        }
        const collection = db.collection(board)
        collection.findOneAndUpdate({
          _id: new ObjectId(thread_id),
        }, {
          $set: {bumped_on: new Date() },
          $push: {replies: newReply}
        }, (updateErr, doc) => {
          if (updateErr) console.log(`Error finding and updating document with replies: ${updateErr}`)
          if (doc.value === null) res.send('incorrect thread id')
          else res.redirect(`/b/${board}/${thread_id}`)
        })

      }
    })

    .delete((req, res) => {
      const board = req.params.board
      const thread_id = req.body.thread_id
      const reply_id = req.body.reply_id
      const delete_password = req.body.delete_password

      if (!board || !thread_id || !reply_id || !delete_password) res.send('missing report request information')
      else {
        const collection = db.collection(board)
        collection.findOneAndUpdate({
          _id: new ObjectId(thread_id),
          replies: { $elemMatch: { _id: new ObjectId(reply_id), delete_password: delete_password } },
        }, { $set: { "replies.$.text": "[deleted]" } }, (updateErr, doc) => {
          if (updateErr) console.log(`Error finding and updating reply: ${updateErr}`)
          if (doc.value === null) res.send('incorrect password')
          else res.send('success')
        })
      }
    })

    .put((req, res) => {
      const board = req.params.board
      const thread_id = req.body.thread_id
      const reply_id = req.body.reply_id

      if (!board || !thread_id || !reply_id) res.send('missing report request information')
      else {
        const collection = db.collection(board)
        collection.findOneAndUpdate({
          _id: new ObjectId(thread_id),
          "replies._id": new ObjectId(reply_id)
        }, { $set: {"replies.$.reported": true} }, (updateErr, doc) => {
          if (updateErr) console.log(`Error finding and updating document: ${updateErr}`)
          if (doc.value === null) res.send('incorrect id provided')
          else res.send('success')
        })
      }
    })

};
