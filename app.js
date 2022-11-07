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
        	console.log("Message sent");
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





const organizationSchema=new mongoose.Schema({
    //username:String,
    password:String,
    googleId:String,
    name:String,
    auth:String,
    role:String,
    pincode:String,
    class:String,
    orgName:String,
    orgUsername:String,
    orgID:String,
    orgTypeOfID:String,
    phone:String,
    optionalPhone:String,
    approved:{
        type:Boolean,
        default:false
    },
    registeredTeacher:{
        type:Boolean,
        default:false
    },
    registeredStudent:{
        type:Boolean,
        default:false
    },
    registeredOrg:{
        type:Boolean,
        default:false
    }
});
const classSchema=new mongoose.Schema({
    className:{type:String,sparse:true,unique:false},
    orgUsername:{type:String,sparse:true,unique:false},
    classStudent:{type:[organizationSchema],sparse:true,unique:false},
    classTeacher:{type:[organizationSchema],sparse:true,unique:false},
    classOrg:{type:[organizationSchema],sparse:true,unique:false}
});

organizationSchema.plugin(passportLocalMongoose);
organizationSchema.plugin(findOrCreate);





const Organization=new mongoose.model("User",organizationSchema);
const Class=new mongoose.model("Class",classSchema);


passport.use(Organization.createStrategy());
passport.serializeUser(function(user,done){
    done(null,user.id);
});
passport.deserializeUser(function(id,done){
    Organization.findById(id,function(err,user){
        done(err,user);
    });
});



/*passport.use(new GoogleStrategy({
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
*/

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
    const username=req.body.username;
    const pincode=req.body.pincode;
    console.log("In the post /registerorganization");
    Organization.register({username:req.body.username},req.body.password,function(err,user){
        if(err){
            console.log(err);
            res.render("registerOrg",{message:"User Already Exists, Please try to login with same username"});
        }
        else{
            
            passport.authenticate("local")(req,res,function(){
                Organization.findOne({username:username},function(err,foundUser){
                    foundUser.role="Admin";
                    foundUser.orgUsername=foundUser.username;
                    foundUser.save();
                });
                res.redirect("/sendemailOrg");
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
    //console.log(req.user);
    console.log("in post/nameorganization");
    Organization.findOneAndUpdate({_id:req.user._id},{$set:{name:req.body.OrganizationName,pincode:req.body.pincode}},function(err,foundOrganization){
        if(!err){
            res.redirect("/homeorganization");
        }
    })
    
})

app.get("/organizationpage",function(req,res){
    if(req.isAuthenticated()){
        //console.log(req.user.name);
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
    //console.log("Under /homeorganization and data of user is "+req.user);
    if(req.isAuthenticated()){
        if(req.user.registeredOrg){
            res.render("homeorganization",{name:req.user.name});
        }
        else{
            Organization.findOne({username:req.user.username,role:"Admin"},function(err,foundUser){
                //Organization.findByIdAndRemove(foundUser._id,function(err){
                    if(!err){
                        console.log("Verify your email First");
                        res.redirect("/sendemailOrg");
                    }
                    else{
                        res.render("unauthorized");
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

app.get("/sendemailOrg",function(req,res){
    let rand=randomStr();
    const auth=req.user.username+rand;
    req.user.auth=auth;
    req.user.save();
    //console.log(req.user.auth);
    sendOTP(req.user.username,rand,auth);
    res.render("enterotp",{email:req.user.username,message:""});
});

app.post("/verifyOrg",function(req,res){
    
        const OTP=req.body.OTP;
    const enteredAuth=req.user.username+OTP;
    if(enteredAuth==req.user.auth){
        req.user.registeredOrg=true;
        //req.user.role="Admin";
        req.user.save();
        res.redirect("/organizationpage");
    }
    else{
        console.log("Incorrect OTP");
        res.render("enterotp",{email:req.user.username, message:"Incorrect OTP, enter the correct OTP"});
    }
    
    
});


app.get("/deleteOrganization",function(req,res){
    Organization.findOne({username:req.user.username},function(err,foundUser){
        Organization.findByIdAndRemove(foundUser._id,function(err){
            if(!err){
                console.log("Deleted Successfully");
                res.redirect("/");
            }
        })
    })
});

app.get("/linkverify/:auth",function(req,res){
    const reqAuth=req.params.auth;
    Organization.findOne({auth:reqAuth},function(err,foundUser){
        if(!err){
            if(foundUser.role=="Admin"){
                foundUser.registeredOrg=true;
        foundUser.save();
        res.redirect("/organizationpage");
            }
            else if(foundUser.role=="Student"){
                foundUser.registeredStudent=true;
        foundUser.save();
        res.redirect("/studentpage");
            }
            else if(foundUser.role=="Teacher"){
                foundUser.registeredTeacher=true;
        foundUser.save();
        res.redirect("/teacherpage");
            }
            
        }
        else{
            console.log("User Not Found");
            res.redirect("/")
        }
    })

});

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
    Organization.find({},function(err,foundOrgs){
        if(!err){
            res.render("registerStudent",{message:"", organization:foundOrgs});
        }
        else{
            res.render("registerStudent",{message:"", organization:false});
        }
    });
    

})

app.get("/createClass",function(req,res){
    if(req.isAuthenticated()){
        if(req.user.registeredOrg){
            res.render("createClass",{name:req.user.name,message:""});
        }
        else{
            Organization.findOne({username:req.user.username,role:"Admin"},function(err,foundUser){
                //Organization.findByIdAndRemove(foundUser._id,function(err){
                    if(!err){
                        console.log("Verify your email First");
                        res.redirect("/sendemailOrg");
                    }
                    else{
                        res.render("unauthorized");
                    }
                //})
            })
        }
    }
    else{
        res.redirect("/loginorganization");
    }
});

app.post("/createClass",function(req,res){
    console.log("post createClass");
    Class.findOne({className:req.body.name, orgUsername:req.user.username},function(err,foundClass){
        if(foundClass){
            res.render("createClass",{message:"Class Already Exist"})
        }
        else{
            const newclass=new Class({
                className:req.body.name,
                orgUsername:req.user.username,
                classOrg:req.user
            });
            newclass.save();
            /*Class.findOne({name:req.body.name, orgUsername:req.user.username},function(err,class){
                class.classOrg.push({})
            })*/
                res.redirect("/homeorganization");
            
            //req.user.classes.push(newclass);
            //req.user.save();
        }
    })
    
});


app.post("/registerstudent",function(req,res){
    const username=req.body.username;
    const pincode=req.body.pincode;
    console.log("In the post /registerorganization");
    Organization.register({username:req.body.username},req.body.password,function(err,user){
        if(err){
            console.log(err);
            res.render("registerStudent",{message:"User Already Exists, Please try to login with same username"});
        }
        else{
            
            passport.authenticate("local")(req,res,function(){
                Organization.findOne({username:username},function(err,foundUser){
                    foundUser.role="Student";
                    foundUser.save();
                });
                res.redirect("/sendemailStudent");
            });
            
        }
        
    });
})

app.get("/sendemailStudent",function(req,res){
    let rand=randomStr();
    const auth=req.user.username+rand;
    req.user.auth=auth;
    req.user.save();
    //console.log(req.user.auth);
    sendOTP(req.user.username,rand,auth);
    res.render("enterotpStudent",{email:req.user.username,message:""});
});

app.post("/verifyStudent",function(req,res){
    const OTP=req.body.OTP;
    const enteredAuth=req.user.username+OTP;
    if(enteredAuth==req.user.auth){
        req.user.registeredStudent=true;
        //req.user.role="Admin";
        req.user.save();
        res.redirect("/studentpage1");
    }
    else{
        console.log("Incorrect OTP");
        res.render("enterotpStudent",{email:req.user.username, message:"Incorrect OTP, enter the correct OTP"});
    }
})

app.get("/studentpage1",function(req,res){
    if(req.isAuthenticated() && req.user.role=="Student"){
        //console.log(req.user.name);
        if(req.user.name){

            res.redirect("/homestudent");
        }
        else{
            Organization.find({role:"Admin",registeredOrg:true,name:{"$ne":""}},function(err,foundOrg){
                if(!err){
                    res.render("studentpage1",{organizations:foundOrg});
                }
                else{
                    res.render("studentpage1",{organizations:false});   
                }
            })
            
        }
        
    }
    else{
        res.redirect("/loginstudent");
    }
});

app.post("/orgstudent",function(req,res){
    if(req.isAuthenticated() && req.user.role=="Student"){
        if(req.body.orgUsername){
            req.user.orgUsername=req.body.orgUsername;
            
            Organization.findOne({username:req.body.orgUsername},function(err,foundOrg){
                if(!err){
                    req.user.orgName=foundOrg.name;
                    req.user.save();
                }
            })
            
        
        Class.find({orgUsername:req.body.orgUsername},function(err,foundClass){
            if(!err){
                res.render("studentpage2",{classes:foundClass});
            }
            else{
                res.render("studentpage2",{classes:false});
            }
            
        })
        }
        else{
            res.redirect("/studentpage1");
        }
        
    }
    else{
        res.redirect("/");
    }
});

app.post("/detailstudent",function(req,res){
    if(req.isAuthenticated() && req.user.orgUsername && req.user.role=="Student"){
        req.user.name=req.body.name;
        req.user.class=req.body.class;
        req.user.orgTypeOfID=req.body.typeOfID;
        req.user.orgID=req.body.orgID;
        req.user.phone=req.body.phone;
        req.user.optionalPhone=req.body.optionalPhone;
        req.user.save();
        /*Organization.findOne({username:req.user.orgUsername}, function(err,foundOrg){
            req.user.orgName=foundOrg.name;
            req.user.save();
        })*/
        Class.findOne({className:req.body.class,orgUsername:req.user.orgUsername},function(err,foundClass){
            foundClass.classStudent.push(req.user);
            foundClass.save();
        })
        res.redirect("/homestudent");
    }
    else{
        res.redirect("/studentpage1");
    }
});

app.get("/homestudent",function(req,res){
    if(req.isAuthenticated()){
        if(req.user.registeredStudent){
            if(req.user.name){
                res.render("homestudent",{name:req.user.name,User:req.user});
            }
            else{
                res.redirect("/studentpage1");
            }
            
        }
        else{
            Organization.findOne({username:req.user.username,role:"Admin"},function(err,foundUser){
                //Organization.findByIdAndRemove(foundUser._id,function(err){
                    if(!err){
                        console.log("Verify your email First");
                        res.redirect("/sendemailOrg");
                    }
                    else{
                        res.render("unauthorized");
                    }
                //})
            })
        }
    }
    else{
        res.redirect("/loginstudent");
    }
});

app.post("/loginstudent",function(req,res){
    const user=new Organization({
        username:req.body.username,
        password:req.body.password
    });
    Organization.findOne({username:req.body.username},function(err,foundUser){
        if(!foundUser){
            res.render("loginstudent",{message:"User Not Found, Please try to Register with same username"})
        }
        else{
            req.login(user,function(err){
                if(err){
                    console.log("User Not Found");
                    console.log(err);
                }
                else{
                    passport.authenticate("local")(req,res,function(){
                        res.redirect("/homestudent");
                    });
                }
            });
        }
    })
})


app.listen(3000,function(){
    console.log("server started on port 3000");
});


/*






            
              
              
              
              
              
                            
*/