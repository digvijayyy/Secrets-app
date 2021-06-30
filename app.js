//jshint esversion:6
require('dotenv').config();
const express=require("express");
const bodyparser=require("body-parser");
const ejs=require("ejs");
const mongoose=require("mongoose");
//const encrypt=require("mongoose-encryption");
//const md5=require("md5");
//const bcrypt= require("bcrypt");
//const saltRounds=10;
const session=require('express-session');
const passport=require('passport');
const passportLocalMongoose=require("passport-local-mongoose"); // salts and hash password
const app=express();
const FacebookStrategy = require('passport-facebook').Strategy;
const GoogleStrategy= require('passport-google-oauth20').Strategy;
const findorCreate=require('mongoose-findorcreate');


//console.log(process.env.SECRET);
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyparser.urlencoded({
  extended:true
}));
app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());

app.use(passport.session());





mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser: true, useUnifiedTopology: true });
mongoose.set("useCreateIndex", true);

const userSchema=new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  facebookId: String,
  secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findorCreate);
//userSchema.plugin(encrypt,{secret: process.env.SECRET, encryptedFields: ["password"] });
const User=new mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secret",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.APP_ID,
    clientSecret: process.env.APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secret"
  },
  function(accessToken, refreshToken, profile, done) {
    User.findOrCreate({facebookId: profile.id},function(err, user) {
        console.log(user);
      if (err) { return done(err); }
      done(null, user);
    });
  }
));

app.get("/",function(req,res){
  res.render("home");
});

app.get("/auth/google",
  passport.authenticate("google",{ scope: ["profile"] }));

  app.get("/auth/google/secret",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });

app.get('/auth/facebook', passport.authenticate('facebook'));

app.get('/auth/facebook/secret',
  passport.authenticate('facebook', { successRedirect: '/secrets',
                                      failureRedirect: '/login' }));

app.get("/login",function(req,res){
  res.render("Login");
});

app.get("/register",function(req,res){
  res.render("register");
});

app.get("/secrets",function(req,res){
  User.find({"secret":{$ne:null}},function(err,foundUsers){
    if(err)
    {
      console.log(err);
    }
    else{
      if(foundUsers){
        res.render("secrets",{userWithSecrets: foundUsers});
      }
    }
  });
});

app.get("/submit",function(req,res){
  if(req.isAuthenticated()){
    res.render("submit");
  }
  else{
    res.redirect("/login");
  }


})

app.get("/logout",function(req,res){
  req.logout();
  res.redirect("/login");
});
app.post("/register", function(req,res){
  User.register({username: req.body.username},req.body.password,function(err,user){
    if(err)
    {
      console.log(err);
      res.redirect("/register");
    }
    else{
      passport.authenticate("local")(req,res,function(){
        res.redirect("/");
      });
    }
  });

});

app.post("/login",function(req,res){
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
  req.login(user, function(err){
    if(err)
    {
      console.log(err);
    }
    else{
      passport.authenticate("local")(req,res,function(){
        res.redirect("/secrets");
      });
    }
  });

});

app.post("/submit",function(req,res){
  const submittedsecret=req.body.secret;
  console.log(req.user);

  User.findById(req.user.id, function(err,foundUser){
    if(err)
    {
      conole.log(err);
    }
    else{
      if(foundUser)
      {
        foundUser.secret= submittedsecret;
        foundUser.save(function(){
          res.redirect("/secrets");
        });

      }
    }
  });
});



  //const password= md5(req.body.password);
























app.listen(3000,function(){
  console.log("server started on port 3000.")
});
