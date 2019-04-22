/*
*
*
*       FILL IN EACH FUNCTIONAL TEST BELOW COMPLETELY
*       -----[Keep the tests in the same order!]-----
*       (if additional are added, keep them at the very end!)
*/

var chaiHttp = require('chai-http');
var chai = require('chai');
var assert = chai.assert;
var server = require('../server');

var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectId;
const MONGODB_CONNECTION_STRING = process.env.DB;

chai.use(chaiHttp);

// initialised by beforeEach - to identify thread and reply to be deleted in DELETE test
let insertedId
let insertedReplyId

beforeEach((done) => {
  MongoClient.connect(MONGODB_CONNECTION_STRING, (connErr, client) => {
    if (connErr) console.log(`error connecting to DB: ${connErr}`)
    const db = client.db('test')
    const collection = db.collection('mocha_test')
    collection.insertOne({
      text: 'beforeEach insert',
      delete_password: 'password',
      created_on: new Date(),
      bumped_on: new Date(),
      reported: false,
      replies: [
        {
          _id: new ObjectId(),
          text: 'test reply text',
          created_on: new Date(),
          delete_password: 'replypassword',
          reported: false
        }
      ]
    }, (dbErr, res) => {
      if (dbErr) console.log(`Error populating db: ${dbErr}`)
      console.log(`Inserted ${res.insertedCount} entries`)
      insertedId = res.insertedId
      insertedReplyId = res.ops[0].replies[0]._id
      console.log('new id: ' + insertedId)
      console.log('new reply id: ' + insertedReplyId)
      done()
    })
   })
})

afterEach((done) => {
  MongoClient.connect(MONGODB_CONNECTION_STRING, (connErr, client) => {
    if (connErr) console.log(`error connecting to DB: ${connErr}`)
    const db = client.db('test')
    const collection = db.collection('mocha_test')
    collection.findOne({}, (findErr, res) => {
      if (findErr) console.log(`Error reading from db: ${findErr}`)
      console.log(res)
    })
    collection.drop((dbErr, confirm) => {
      if (dbErr) console.log(`Error dropping test board: ${dbErr}`)
      if (confirm) console.log('successfully dropped test board')
      done()
    })
  })
})

suite('Functional Tests', function() {

  suite('API ROUTING FOR /api/threads/:board', function() {
    
    suite('POST', function() {
      
      test('post a new thread to test message board', (done) => {
        chai.request(server)
          .post(`/api/threads/mocha_test`)
          .send({
            text: 'test text',
            delete_password: 'testpass'
          })
          .end((err, res) => {
            assert.equal(res.status, 200, 'Response should be 200 ok')
            done()
          })
      })
    });
    
    suite('GET', function() {

      test('get an array of threads from message board', (done) => {
        chai.request(server)
          .get(`/api/threads/mocha_test`)
          .end((err, res) => {
            assert.equal(res.status, 200, 'Response should be 200 ok')
            assert.isArray(res.body, 'Response body should be array')
            assert.equal(res.body.length, 1, 'response should currently have 1 thread')
            assert.property(res.body[0], '_id')
            assert.property(res.body[0], 'created_on')
            assert.property(res.body[0], 'bumped_on')
            assert.property(res.body[0], 'text')
            assert.equal(res.body[0].text, 'beforeEach insert', 'text should match beforeEach data')
            assert.property(res.body[0], 'replies')
            assert.notProperty(res.body[0], 'reported')
            assert.notProperty(res.body[0], 'delete_password')
            assert.isArray(res.body[0].replies)
            assert.isBelow(res.body[0].replies.length, 4)
            done()
          })
      })
    });
    
    suite('DELETE', function() {

      test('delete test thread - incorrect password', (done) => {
        console.log('delete id: ' + insertedId)
        chai.request(server)
          .delete(`/api/threads/mocha_test`)
          .send({
            thread_id: insertedId,
            delete_password: 'badpassword'
          })
          .end((err, res) => {
            assert.equal(res.status, 200, 'Response should be 200 ok')
            assert.equal(res.text, 'incorrect password', 'should receive failure message')
            done()
          })
      })

      test('delete test thread - correct password', (done) => {
        chai.request(server)
          .delete(`/api/threads/mocha_test`)
          .send({
            thread_id: insertedId,
            delete_password: 'password'
          })
          .end((err, res) => {
            assert.equal(res.status, 200, 'Response should be 200 ok')
            assert.equal(res.text, 'success', 'should receive success message')
            done()
          })
      })
    });
    
    suite('PUT', function() {

      test('report a thread', (done) => {
        chai.request(server)
          .put(`/api/threads/mocha_test`)
          .send({
            thread_id: insertedId,
          })
          .end((err, res) => {
            assert.equal(res.status, 200, 'Response should be 200 ok')
            assert.equal(res.text, 'success', 'should receive success message')
            done()
          })
      })
    });
    

  });
  
  suite('API ROUTING FOR /api/replies/:board', function() {
    
    suite('POST', function() {

      test('post a new reply to existing thread', (done) => {
        chai.request(server)
          .post(`/api/replies/mocha_test`)
          .send({
            thread_id: insertedId,
            text: 'test text',
            delete_password: 'testpass'
          })
          .end((err, res) => {
            assert.equal(res.status, 200, 'Response should be 200 ok')
            done()
          })
      })
    });
    // /api/replies/{board}?thread_id={thread_id}
    suite('GET', function() {

      test('get replies from a thread', (done) => {
        chai.request(server)
          .get(`/api/replies/mocha_test`)
          .query({
            thread_id: insertedId.toString()
          })
          .end((err, res) => {
            assert.equal(res.status, 200, 'Response should be 200 ok')
            assert.equal(res.body.replies.length, 1, 'Should have 1 reply')
            assert.equal(res.body.replies[0].text, 'test reply text', 'Reply text should match initial entry')
            done()
          })
      })
    });
    
    suite('PUT', function() {

      test('report a reply', (done) => {
        chai.request(server)
          .put(`/api/replies/mocha_test`)
          .send({
            thread_id: insertedId,
            reply_id: insertedReplyId
          })
          .end((err, res) => {
            assert.equal(res.status, 200, 'Response should be 200 ok')
            assert.equal(res.text, 'success', 'should receive success message')
            done()
          })
      })
    });
    
    suite('DELETE', function() {

      test('delete test reply - incorrect password', (done) => {
        chai.request(server)
          .delete(`/api/replies/mocha_test`)
          .send({
            thread_id: insertedId,
            reply_id: insertedReplyId,
            delete_password: 'badpassword'
          })
          .end((err, res) => {
            assert.equal(res.status, 200, 'Response should be 200 ok')
            assert.equal(res.text, 'incorrect password', 'should receive failure message')
            done()
          })
      })

      test('delete test reply - correct password', (done) => {
        chai.request(server)
          .delete(`/api/replies/mocha_test`)
          .send({
            thread_id: insertedId,
            reply_id: insertedReplyId,
            delete_password: 'replypassword'
          })
          .end((err, res) => {
            assert.equal(res.status, 200, 'Response should be 200 ok')
            assert.equal(res.text, 'success', 'should receive success message')
            done()
          })
      })
    });
    
  });

});

