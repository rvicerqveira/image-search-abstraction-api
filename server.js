var express = require('express')
var app = express()
var mongodb = require('mongodb')
var Bing = require('node-bing-api')
var path = require('path')
require('dotenv').config({silent: true})
var port = process.env.PORT || 8080
var url = process.env.MONGODB_URI || 'mongodb://localhost:27017/image-search'
var MongoClient = mongodb.MongoClient

app.use(express.static(path.join(__dirname, './public')))
app.set('views', path.join(__dirname, "./templates"))
app.set('view engine', 'jade')

app.get('/', function (req, res) {
  res.render('index', { title: 'Image Search Abstraction Layer' })
})

app.get('/latest', function (req, res) {
  MongoClient.connect(url, function (err, db) {
    if (err) {
      //console.log('Unable to connect to the mongoDB server. Error:', err)
      throw err
    } else {
      //console.log('Connection established to', url)
      var collection = db.collection('researchs')
      collection.find({}, {
          term: 1
        , when: 1
        , _id: 0
        }).sort({ 
          when: -1 
        }).toArray(function(err, researchs) {
        if (err) throw err
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(researchs))
        db.close()
      })
    }
  })
})

app.get('/:query', function (req, res) {
  var query = req.params.query
  var size = req.query.offset || 10
  if (query !== 'favicon.ico') {
    var search = new Bing({ accKey: process.env.SEARCH_KEY })
    search.images(query, {
      top: size
    }, function(error, results, body){
      MongoClient.connect(url, function (err, db) {
        //if (err) throw err
        if (err) {
          //console.log('Unable to connect to the mongoDB server. Error:', err)
          throw err
        } else {
          var collection = db.collection('researchs')
          var doc = {
            term: query,
            when: new Date()
          }
          collection.insert(doc, function(err, data) {
            if (err) throw err
            var images = []
            if(body.value.length>0){
              images = body.value.map(function(image){
                return {
                  url:image.contentUrl,
                  snippet:image.name,
                  thumbnail:image.thumbnailUrl,
                  context:image.hostPageUrl
                }
              })
            }
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify(images))
            db.close()
          })
        }
      })
    })
  }else{
    res.writeHead(404)
    res.end()
  }
})

app.listen(port, function () {
  console.log('Example app listening on port ' + port + '!')
})
