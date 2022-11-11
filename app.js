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

function sendrequest(email,message){
    var smtpTransport = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
              user: process.env.EMAIL,
              pass: process.env.PASSWORD
            }
    });
    var mailOptions;
    mailOptions={
        from: 'mmrchmanohar@gmail.com',
		to : email,
		subject : "You have Join Request on AI-Gurukul app from your organization",
		html : ""+message+"<p>Thanks and regards</p><p>AI GuruKul</p>"	
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
    username:{type:String,sparse:true,unique:false},
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
const classSchema=({
    className:{type:String,sparse:true,unique:false},
    orgUsername:{type:String,sparse:true,unique:false},
    classStudent:{type:[organizationSchema],index:false,sparse:false,unique:false},
    classTeacher:{type:[organizationSchema],index:false,sparse:false,unique:false},
    classOrg:{type:[organizationSchema],index:false,sparse:false,unique:false}
});

organizationSchema.plugin(passportLocalMongoose,{usernameField: 'username'});
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
            const orgUsername=req.user.username;
            Class.find({"classOrg.username":orgUsername},function(err,foundClass){
                
                if(foundClass){
                    Organization.find({"orgUsername":orgUsername,role:"Teacher",registeredTeacher:true},function(err,foundTeacher){
                        if(foundTeacher){
                            Organization.find({orgUsername:orgUsername,role:"Student",registeredStudent:true},function(err,foundStudent){
                                if(foundStudent){
                                    res.render("homeorganization",{User:req.user,Clas:foundClass,Teacher:foundTeacher,Student:foundStudent});
                                }
                                else{
                                    res.render("homeorganization",{User:req.user,Clas:foundClass,Teacher:foundTeacher,Student:false});
                                }
                            })
                        }
                        else{
                            Organization.find({orgUsername:orgUsername,role:"Student",registeredStudent:true},function(err,foundStudent){
                                if(foundStudent){
                                    res.render("homeorganization",{User:req.user,Clas:foundClass,Teacher:false,Student:foundStudent});
                                }
                                else{
                                    res.render("homeorganization",{User:req.user,Clas:foundClass,Teacher:false,Student:false});
                                }
                            })
                        }
                    })
                }
                else{
                    Organization.find({"orgUsername":orgUsername,role:"Teacher",registeredTeacher:true},function(err,foundTeacher){
                        if(foundTeacher){
                            Organization.find({orgUsername:orgUsername,role:"Student",registeredStudent:true},function(err,foundStudent){
                                if(foundStudent){
                                    res.render("homeorganization",{User:req.user,Clas:false,Teacher:foundTeacher,Student:foundStudent});
                                }
                                else{
                                    res.render("homeorganization",{User:req.user,Clas:false,Teacher:foundTeacher,Student:false});
                                }
                            })
                        }
                        else{
                            Organization.find({orgUsername:orgUsername,role:"Student",registeredStudent:true},function(err,foundStudent){
                                if(foundStudent){
                                    res.render("homeorganization",{User:req.user,Clas:false,Teacher:false,Student:foundStudent});
                                }
                                else{
                                    res.render("homeorganization",{User:req.user,Clas:false,Teacher:false,Student:false});
                                }
                            })
                        }
                    })
                }
            })
        }
        else{
            Organization.findOne({username:req.user.username,role:"Admin"},function(err,foundUser){
                //Organization.findByIdAndRemove(foundUser._id,function(err){
                    if(foundUser){
                        console.log("Verify your email First");
                        if(foundUser.role=="Admin"){
                            res.redirect("/sendemailOrg");
                        }
                        else{
                            res.render("unauthorized");
                        }
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
    if(req.isAuthenticated()){
        let rand=randomStr();
    const auth=req.user.username+rand;
    req.user.auth=auth;
    req.user.save();
    //console.log(req.user.auth);
    sendOTP(req.user.username,rand,auth);
    res.render("enterotp",{email:req.user.username,message:""});
    }
    else{
        res.redirect("/");
    }
});

app.post("/verifyOrg",function(req,res){
    
        const OTP=req.body.OTP;
    const enteredAuth=req.user.username+OTP;
    if(enteredAuth==req.user.auth){
        if(req.user.role=="Admin"){
            req.user.registeredOrg=true;
            req.user.save();
        }
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
        res.redirect("/studentpage1");
            }
            else if(foundUser.role=="Teacher"){
                foundUser.registeredTeacher=true;
        foundUser.save();
        res.redirect("/teacherpage1");
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


/*











STUDENT PART











*/


app.post("/registerstudent",function(req,res){
    const username=req.body.username;
    const pincode=req.body.pincode;
    console.log("In the post /registerstudent");
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
    if(req.isAuthenticated()){
        let rand=randomStr();
    const auth=req.user.username+rand;
    req.user.auth=auth;
    req.user.save();
    //console.log(req.user.auth);
    sendOTP(req.user.username,rand,auth);
    res.render("enterotpStudent",{email:req.user.username,message:""});
    }
    else{
        res.redirect("/");
    }
    
});

app.post("/verifyStudent",function(req,res){
    const OTP=req.body.OTP;
    const enteredAuth=req.user.username+OTP;
    if(enteredAuth==req.user.auth){
        if(req.user.role=="Student"){
            req.user.registeredStudent=true;
            req.user.save();
        }
        //req.user.role="Admin";
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
                Class.findOne({"classStudent.username":req.user.username},function(err,foundClass){
                    if(!err){
                        res.render("homestudent",{User:req.user,Class:foundClass});
                    }
                    else{
                        res.render("homestudent",{User:req.user,Class:false});
                    }
                })
                
            }
            else{
                res.redirect("/studentpage1");
            }
            
        }
        else{
            Organization.findOne({username:req.user.username,role:"Student"},function(err,foundUser){
                //Organization.findByIdAndRemove(foundUser._id,function(err){
                    if(foundUser){
                        console.log("Verify your email First");
                        if(foundUser.role=="Student"){
                            res.redirect("/sendemailStudent");
                        }
                        else{
                            res.render("unauthorized");
                        }
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
/*







TEACHER PART










*/
app.post("/registerteacher",function(req,res){
    const username=req.body.username;
    const pincode=req.body.pincode;
    console.log("In the post /registerteacher");
    Organization.register({username:req.body.username},req.body.password,function(err,user){
        if(err){
            console.log(err);
            res.render("registerTeacher",{message:"User Already Exists, Please try to login with same username"});
        }
        else{
            
            passport.authenticate("local")(req,res,function(){
                Organization.findOne({username:username},function(err,foundUser){
                    foundUser.role="Teacher";
                    foundUser.save();
                });
                res.redirect("/sendemailTeacher");
            });
            
        }
        
    });
});

app.get("/sendemailTeacher",function(req,res){
    if(req.isAuthenticated()){
        let rand=randomStr();
    const auth=req.user.username+rand;
    req.user.auth=auth;
    req.user.save();
    //console.log(req.user.auth);
    sendOTP(req.user.username,rand,auth);
    res.render("enterotpTeacher",{email:req.user.username,message:""});
    }
    else{
        res.redirect("/");
    }
});

app.post("/verifyTeacher",function(req,res){
    const OTP=req.body.OTP;
    const enteredAuth=req.user.username+OTP;
    if(enteredAuth==req.user.auth){
        if(req.user.role=="Teacher"){
            req.user.registeredTeacher=true;
            req.user.save();
        }
        
        res.redirect("/teacherpage1");
    }
    else{
        console.log("Incorrect OTP");
        res.render("enterotpTeacher",{email:req.user.username, message:"Incorrect OTP, Please enter the correct OTP"});
    }
});


app.get("/teacherpage1",function(req,res){
    if(req.isAuthenticated() && req.user.role=="Teacher"){
        //console.log(req.user.name);
        if(req.user.name){

            res.redirect("/hometeacher");
        }
        else{
            Organization.find({role:"Admin",registeredOrg:true,name:{"$ne":""}},function(err,foundOrg){
                if(!err){
                    res.render("teacherpage1",{organizations:foundOrg});
                }
                else{
                    res.render("teachertpage1",{organizations:false});   
                }
            })
            
        }
        
    }
    else{
        res.redirect("/loginteacher");
    }
});


app.post("/orgteacher",function(req,res){
    if(req.isAuthenticated() && req.user.role=="Teacher"){
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
                res.render("teacherpage2",{classes:foundClass});
            }
            else{
                res.render("teacherpage2",{classes:false});
            }
            
        })
        }
        else{
            res.redirect("/teacherpage1");
        }
        
    }
    else{
        res.redirect("/");
    }
});


app.post("/detailteacher",function(req,res){
    if(req.isAuthenticated() && req.user.orgUsername && req.user.role=="Teacher"){
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
        Class.find({orgUsername:req.user.orgUsername},function(err,foundClasses){
            foundClasses.forEach(function(clas){
                clas.classTeacher.push(req.user);
                clas.save();
            })
        })
        res.redirect("/hometeacher");
    }
    else{
        res.redirect("/teacherpage1");
    }
});


app.get("/hometeacher",function(req,res){
    if(req.isAuthenticated()){
        if(req.user.registeredTeacher){
            if(req.user.name){
                Class.find({"classTeacher.username":req.user.username},function(err,foundClass){
                    if(!err){
                        res.render("hometeacher",{User:req.user,Clas:foundClass});
                    }
                    else{
                        res.render("hometeacher",{User:req.user,Clas:false});
                    }
                })
                
            }
            else{
                res.redirect("/teacherpage1");
            }
            
        }
        else{
            Organization.findOne({username:req.user.username,role:"Teacher"},function(err,foundUser){
                //Organization.findByIdAndRemove(foundUser._id,function(err){
                    if(foundUser){
                        console.log("Verify your email First");
                        if(foundUser.role=="Teacher"){
                            res.redirect("/sendemailTeacher");
                        }
                        else{
                            res.render("unauthorized");
                        }
                    }
                    else{
                        res.render("unauthorized");
                    }
                //})
            })
        }
    }
    else{
        res.redirect("/loginteacher");
    }
});


app.post("/loginteacher",function(req,res){
    const user=new Organization({
        username:req.body.username,
        password:req.body.password
    });
    Organization.findOne({username:req.body.username},function(err,foundUser){
        if(!foundUser){
            res.render("loginteacher",{message:"User Not Found, Please try to Register with same username"})
        }
        else{
            req.login(user,function(err){
                if(err){
                    console.log("User Not Found");
                    console.log(err);
                }
                else{
                    passport.authenticate("local")(req,res,function(){
                        res.redirect("/hometeacher");
                    });
                }
            });
        }
    })
})

app.get("/addteacher",function(req,res){
    if(req.isAuthenticated()){
        if(req.user.role=="Admin"&&req.user.registeredOrg==true){
            res.render("addteacher",{Org:req.user});
        }
        else{
            res.render("unauthorized");
        }
    }
    else{
        res.redirect("/");
    }
});

app.post("/addteacher",function(req,res){
    const email=req.body.email;
    const message="Hello,\nGreetings of the day,\nYou are invited by organization: "+req.user.name+","+req.user.pincode+"\n Please visit our AI Gurukul App now to join this organization as teacher"
    sendrequest(email,message);
    res.redirect("/homeorganization")
})

/*

















*/


app.post("/approvedelete",function(req,res){
    const id=req.body.userID;
    if(req.isAuthenticated()){
        if(req.user.role=="Admin"&&req.user.registeredOrg==true){
            console.log("Inside");
            if(req.body.Request=="Approve"){
                //console.log("Approve Pending");
                Organization.findOne({_id:id},function(err,foundUser){
                    foundUser.approved=true;
                    foundUser.save();
                    res.redirect("/homeorganization");
                })
            }
            else if(req.body.Request=="Remove"){
                Organization.findByIdAndRemove(id,function(err){
                    if(!err){
                        console.log("Successfully Removed and deleted account");
                        res.redirect("/homeorganization");
                    }
                });
            }
            else if(req.body.Request=="Reject"){
                Organization.findByIdAndRemove(id,function(err){
                    if(!err){
                        console.log("Successfully Removed and deleted account");
                        res.redirect("/homeorganization");
                    }
                });
            }
        }
    } 
})


app.get("/addstudent",function(req,res){
    if(req.isAuthenticated()){
        if(req.user.role=="Admin"&&req.user.registeredOrg==true){
            res.render("addstudent",{Org:req.user});
        }
        else{
            res.render("unauthorized");
        }
    }
    else{
        res.redirect("/");
    }
});



app.post("/addstudent",function(req,res){
    const email=req.body.email;
    const message="Hello,\nGreetings of the day,\nYou are invited by organization: "+req.user.name+","+req.user.pincode+"\n Please visit our AI Gurukul App now to join this organization as a Student"
    sendrequest(email,message);
    res.redirect("/homeorganization")
})


app.listen(3000,function(){
    console.log("server started on port 3000");
});


/*






            
              
              
              
              
              
                            
*/