require('dotenv').config();
const express=require("express");
const bodyParser=require("body-parser");
const mongoose=require("mongoose");
const ejs=require("ejs");
const session=require("express-session");
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate=require("mongoose-findOrCreate");
const nodemailer = require("nodemailer");

const app=express();

app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static("public"));

app.use(session({
    secret:"ManoharSecret",
    resave:false,
    saveUninitialized:false
}));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/organizationsDB");

function sendOTP(email,auth,authcode){
    var smtpTransport = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
              user: process.env.EMAIL,
              pass: process.env.PASSWORD
            }
    });
    const link = `http://localhost:3000/linkverify/${authcode}`;
    var mailOptions;
    mailOptions={
        from: 'mmrchmanohar@gmail.com',
		to : email,
		subject : "Please confirm your Email account",
		html : "Your OTP for Email verification is: "+auth+"<br><br>Or,Click this link "+link+" <br>ThankYou <br>Regards,<br>AI-GURUKUL"	
	}
    smtpTransport.sendMail(mailOptions, function(error, response){
   	 if(error){
        	console.log(error);
	 }else{
        	console.log("Message sent: " + response.message);
    	 }
});


}


function randomStr(){
    let OTP="";
    const n=6;
    for(let i=0;i<n;i++){
        OTP=OTP+Math.floor(Math.random()*10);
    }
    return OTP;
}



const studentSchema=new mongoose.Schema({
    organizationUsername:String,
    username:String,
    password:String,
    googleId:String,
    studentId:String,
    name:String,
    auth:String,
    role:String,
    registered:{
        type:Boolean,
        default:false
    }
});

const teacherSchema=new mongoose.Schema({
    organizationUsername:String,
    username:String,
    password:String,
    googleId:String,
    teacherId:String,
    name:String,
    auth:String,
    role:String,
    registered:{
        type:Boolean,
        default:false
    }
});

const organizationSchema=new mongoose.Schema({
    username:String,
    password:String,
    googleId:String,
    name:String,
    auth:String,
    role:String,
    teachers:[teacherSchema],
    students:[studentSchema],
    registeredOrg:{
        type:Boolean,
        default:false
    }
});

organizationSchema.plugin(passportLocalMongoose);
organizationSchema.plugin(findOrCreate);

const Organization=new mongoose.model("Organization",organizationSchema);

passport.use(Organization.createStrategy());
passport.serializeUser(function(user,done){
    done(null,user.id);
});
passport.deserializeUser(function(id,done){
    Organization.findById(id,function(err,user){
        done(err,user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/organizationpage",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    //console.log(profile);
    //console.log(accessToken);
    //console.log(refreshToken);
    //console.log(profile.emails[0].value);Not Working
    Organization.findOrCreate({ googleId: profile.id }, function (err, user) {
        //user.username:profile.emails[0];
        //user.save();
      return cb(err, user);
    });
  }
));

app.get("/auth/google",
  passport.authenticate("google", { scope: ['profile'] }));

  app.get("/auth/google/organizationpage", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    req.user.registeredOrg=true;
    req.user.save();
    res.redirect('/organizationpage');
  });


app.get("/",function(req,res){
    res.render("first-page");
});

app.get("/loginorganization",function(req,res){
    res.render("loginOrg",{message:""});
});
app.get("/registerorganization",function(req,res){
    res.render("registerOrg",{message:""});
});

app.post("/registerorganization",function(req,res){
    console.log("In the post /registerorganization");
    Organization.register({username:req.body.username},req.body.password,function(err,user){
        if(err){
            console.log(err);
            res.render("registerOrg",{message:"User Already Exists, Please try to login with same username"});
        }
        else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/sendemail");
            });
        }
    });
});

app.post("/loginorganization",function(req,res){
    const user=new Organization({
        username:req.body.username,
        password:req.body.password
    });
    Organization.findOne({username:req.body.username},function(err,foundUser){
        if(!foundUser){
            res.render("loginOrg",{message:"User Not Found, Please try to Register with same username"})
        }
        else{
            req.login(user,function(err){
                if(err){
                    console.log("User Not Found");
                    console.log(err);
                }
                else{
                    passport.authenticate("local")(req,res,function(){
                        res.redirect("/homeorganization");
                    });
                }
            });
        }
    })
    
})


app.post("/nameorganization",function(req,res){
    console.log(req.user);
    console.log("in post/nameorganization");
    Organization.findOneAndUpdate({_id:req.user._id},{$set:{name:req.body.OrganizationName}},function(err,foundOrganization){
        if(!err){
            res.redirect("/homeorganization");
        }
    })
    
})

app.get("/organizationpage",function(req,res){
    if(req.isAuthenticated()){
        console.log(req.user.name);
        if(req.user.name){
            res.redirect("/homeorganization");
        }
        else{
            res.render("organizationpage");
        }
        
    }
    else{
        res.redirect("/loginorganization");
    }
});

app.get("/homeorganization",function(req,res){
    console.log("Under /homeorganization and data of user is "+req.user);
    if(req.isAuthenticated()){
        if(req.user.registeredOrg){
            res.render("homeorganization",{name:req.user.name});
        }
        else{
            Organization.findOne({username:req.user.username},function(err,foundUser){
                //Organization.findByIdAndRemove(foundUser._id,function(err){
                    if(!err){
                        console.log("Verify your email First");
                        res.redirect("/sendemail");
                    }
                //})
            })
        }
    }
    else{
        res.redirect("/loginorganization");
    }
})

app.get("/logoutorganization",function(req,res){
    req.logout(function(err){
        if(err){
            res.send(err);
        }
    });
    res.redirect("/");
});

app.get("/sendemail",function(req,res){
    let rand=randomStr();
    const auth=req.user.username+rand;
    req.user.auth=auth;
    req.user.save();
    console.log(req.user.auth);
    sendOTP(req.user.username,rand,auth);
    res.render("enterotp",{email:req.user.username});
});

app.post("/verify",function(req,res){
    const OTP=req.body.OTP;
    const enteredAuth=req.user.username+OTP;
    if(enteredAuth==req.user.auth){
        req.user.registeredOrg=true;
        req.user.save();
        res.redirect("/organizationpage");
    }
})


app.get("/deleteOrganization",function(req,res){
    Organization.findOne({username:req.user.username},function(err,foundUser){
        Organization.findByIdAndRemove(foundUser._id,function(err){
            if(!err){
                console.log("Deleted Successfully");
                res.redirect("/");
            }
        })
    })
})

app.get("/linkverify/:auth",function(req,res){
    const reqAuth=req.params.auth;
    Organization.findOne({auth:reqAuth},function(err,foundUser){
        if(!err){
            foundUser.registeredOrg=true;
        foundUser.save();
        res.redirect("/organizationpage");
        }
        else{
            console.log("User Not Found");
            res.redirect("/")
        }
    })

})

app.get("/aboutus",function(req,res){
    res.render("aboutUs");
})

app.get("/adminfirstpage",function(req,res){
    res.render("adminFirstPage");
})

app.get("/teacherfirstpage",function(req,res){
    res.render("teacherFirstPage");
})

app.get("/studentfirstpage",function(req,res){
    res.render("studentFirstPage");
})


app.get("/loginchoose",function(req,res){
    res.render("loginChooseUser");
})

app.get("/registerchoose",function(req,res){
    res.render("registerChooseUser");
})

app.get("/loginteacher",function(req,res){
    res.render("loginteacher",{message:""});
});

app.get("/loginstudent",function(req,res){
    res.render("loginstudent",{message:""});
});

app.get("/registerteacher",function(req,res){
    res.render("registerTeacher",{message:""});
})

app.get("/registerstudent",function(req,res){
    res.render("registerStudent",{message:""});
})

app.listen(3000,function(){
    console.log("server started on port 3000");
});