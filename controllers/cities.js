require('dotenv').config()

let express = require('express');
let router = express.Router();
let mbClient = require('@mapbox/mapbox-sdk')
let mbGeocode = require('@mapbox/mapbox-sdk/services/geocoding')
let db = require('../models')

//give mapbox key
const mapboxKey = process.env.MAPBOX_KEY
const mb = mbClient({ accessToken : mapboxKey })
const geocode = mbGeocode(mb)

router.get('/search', (req,res) =>{
  res.render('cities/search')
})

router.get('/results',(req,res)=>{
  if(req.query.name){
    console.log(req.query)
    //forward geocode with req.query.name and req.query.state
    geocode.forwardGeocode({
      query: req.query.name + ", " + req.query.state,
      types: ['place'],
      countries : ['us']
    }).send().then(response =>{
       //check if  response.body.features.length >0
       let results = response.body.features.map(city =>{
         let placeNameArray = city.place_name.split(', ')
         return {
           name : placeNameArray[0],
           state : placeNameArray[1],
           lat : city.center[1],
           long : city.center[0]
         }
       })
       res.render('cities/results', { results })
       //iterate through the response.body.features and add them to an array to display
     })
     .catch(err =>{
       console.log(err)
       res.render('404')
     })

  }else{
    res.send('nothing ')
  }
})

router.get('/cities/faves', (req,res)=>{
  db.city.findAll()
  .then(faves =>{
    //create an array of geojson markers from our faves
    let markers = faves.map(faveCity =>{
      let markerObj = {
        "type":"Feature",
        "geometry":{
          "type": "Point",
          "coordinates": [faveCity.long , faveCity.lat]
        },
        "properties": {
          "title": faveCity.name,
          "icon" : "airport"
        }
      }
      return JSON.stringify(markerObj)
    })
    console.log(markers)
    res.render('cities/faves', { faves , mapkey: mapboxKey, markers })
  })
  .catch(err =>{
    console.log(err)
    res.render('404')
  })
})


router.post('/faves',(req,res) =>{
  db.city.findOrCreate({
    where: {name: req.body.name},
    defaults: req.body
  })
  .spread((city,created) =>{
    if(created){
      console.log("created: " + city.name)
    }
    //redirect to index of all faves
    res.redirect('/cities/faves')
  })
  .catch(err =>{
    console.log(err)
    res.render('404')
  })
})


router.delete('/remove', (req,res) =>{
  db.city.destroy({
    where: {id : req.body.id }
  })
  .then(deletedPlace =>{
    console.log(deletedPlace)
    res.redirect('/cities/faves')
  })
  .catch(err =>{
    console.log(err)
    res.render('404')
  })
})


module.exports = router
