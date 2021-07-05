const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const path = require("path");
const hbs = require("hbs");
const alert = require("alert");
const session = require('express-session');
const cookieParser  = require('cookie-parser')
const client = require("twilio")('AC462bfd232696c671596bbf75f9febfec','da4b245003d9469ecf4e789f038e44ca');

var firebase = require("firebase/app");
var firebaseauth = require("firebase/auth");
var firestore = require("firebase/firestore");
var firestorage = require("firebase/storage");
var otp = Math.floor((Math.random() * 10000) + 1);
var verify = otp;

var firebaseConfig = {
    apiKey: "AIzaSyCjToW81dS5tnprLe_m_1nMrM3kVxFnIas",
    authDomain: "land-registry-7d606.firebaseapp.com",
    projectId: "land-registry-7d606",
    storageBucket: "land-registry-7d606.appspot.com",
    messagingSenderId: "392477987356",
    appId: "1:392477987356:web:1d508eec027cc5910fc5d9",
    measurementId: "G-TYJTSQZ38D"
}


firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const template_path = path.join(__dirname, "../templates/views");
const static_path = path.join(__dirname, "../public");
const partials_path = path.join(__dirname, "../templates/partials");


app.use(express.json());
app.use(express.urlencoded({extended:false}));
app.use(express.static(static_path));
app.set("view engine", "hbs");
app.set("views",template_path);

hbs.registerPartials(partials_path);
app.use(cookieParser());
app.use(session({
	secret: "Its Secret",
	resave : true,
	saveUninitialized : true
	}));

app.use(function(req,res,next) {
	res.locals.session = req.session;
	next();
});

app.get("/", (req, res) => {
	if(req.session.email){
		res.redirect("/dashboard");
	}
	else if(req.session.phone) {
		if(req.session.otp_number){
			res.redirect("register");
		}
		else {
			res.redirect("verify_otp");
		}
	}else{
	res.render("index"); 
	}
});

app.get("/otp", (req, res) => {
	if(!req.session.phone){
	res.render("otp"); 
	}else{
		res.redirect("/verify_otp");
	}
});

app.post("/otp", (req, res) => {
	try{
		var num = req.body.otp;
		req.session.phone = num;
		req.session.save();
		sendmessage(num);
		res.redirect("/verify_otp"); 
	}catch(err) {
		console.log(err);
		res.render("otp");
		alert("Some error Occured Otp not sent");
	}
});

app.get("/verify_otp", (req, res) => {

	if(req.session.phone){
		if(req.session.email && req.session.otp_number){
		res.redirect("/dashboard"); 
	}else if(req.session.otp_number){
		res.redirect("/register");
	}
	else{
	res.render("verify_otp"); 
	}
}else{
	res.redirect("/otp");
}
});

app.post("/verify_otp", (req, res) => {

	try {
		var num = req.body.otp_number;
		if(num == verify) {
			req.session.otp_number = num;
			if(req.session.phone && req.session.email){
				res.redirect("/dashboard");
			}
			else{
				
			res.redirect("/register");
		}
		}
		else{
			res.write(
      '<script>window.alert("Otp Is not correct");window.location="/";</script>'
    );
			}

	}catch(err) {
		res.render("verify_otp");
	}

});

app.get("/register", (req, res) => {
	if(req.session.phone){
		if(req.session.email){
			res.redirect("/dashboard");
		}else if(req.session.otp_number){
	res.render("register");
}else {
	res.render("verify_otp");
}
 	}else{
 		res.redirect("/otp");
 	}
});

app.post("/register", (req, res) => {

	try {
		var name   		=   req.body.full_name;
		var email  		= 	req.body.email;
		var address		= 	req.body.address;
		var password    =	req.body.password;
		var confirm_password = req.body.confirm_password;

		if(!req.session.meta_add){
		if (password == confirm_password){
		
		firebase.auth().createUserWithEmailAndPassword(email,password).then(()=>{
				console.log("sucess");
			 db.collection("users").doc(email).set({"Full_Name":name,
			"Email":email,"password":password,"Mobile":req.session.phone,"address":address}).then((result)=>{
				req.session.email = email;
				res.redirect("/dashboard");
				
			}).catch((err) => {
				res.write(
      '<script>window.alert("Not Registerd Successfully");window.location="/";</script>'
    );
			});
				
			}).catch((err) => {
				res.render("register");
			});

	}else{
		res.write(
      '<script>window.alert("Password And Confirm Password Are Not Same");window.location="/";</script>'
    );
	}
}
}catch(err){
		res.render("register");
	}

});

app.get("/login", (req, res) => {
	if(req.session.email){
		res.redirect("/dashboard");
	}else{
	res.render("login");
	}
});

app.post("/login", async (req,res) => {
	try {
		var email = req.body.email;
		var password = req.body.password;
		firebase.auth().signInWithEmailAndPassword(email,password).then(()=>{
				console.log("sucess");
				req.session.email = email;
				db.collection("users").where('Email','==', email).get().then((snapshot) => {
					snapshot.docs.forEach(doc => {
						console.log(doc.data());
						if (email == doc.data().Email){ 
						req.session.phone = doc.data().Mobile;
						sendmessage(req.session.phone);
						res.redirect("/verify_otp");
					}
					});
				}).catch(err => console.log(err));
				
			}).catch((err) => {
				console.log(err);
				res.redirect("/login");
			});
	}catch(err){
		res.render("login");
	}
	
});


app.get("/dashboard", (req, res) => {

	if(req.session.phone && req.session.email && req.session.otp_number){

		var docRef = db.collection("users").doc(req.session.email).collection("Properties");
var object = [];
docRef.get().then((snapshot) => {
    snapshot.docs.forEach(doc => {
		object.push(doc.data());
	});
	res.render("dashboard",{object:object});
}).catch((error) => {
    console.log("Error getting document:", error);
});

}else if(req.session.phone || req.session.email){
	res.redirect("/verify_otp");
}
else{
	res.redirect("/login");
}

});

app.post("/dashboard", (req, res) => {
	res.render("dashboard");
});

app.get("/createProperty", (req, res) => {
	if(req.session.phone && req.session.email){
		db.collection("users").where('Email','==', req.session.email).get().then((snapshot) => {
					snapshot.docs.forEach(doc => {
					res.render("createProperty",{address:doc.data().address});
					});
				}).catch((err) => {
					res.write("Some error Occured");
				});
	}else if(req.session.phone){
		res.render("/verify_otp");
	}
	else{
		res.redirect("/login");
	}
});

app.post("/createProperty", (req, res) => {
	try {
		var fileName = req.body.path;
		var pro_name = req.body.land_name;
		var pro_address	= req.body.land_address;
		var pro_price	= req.body.land_price;
		var pro_state	= req.body.land_state;
		var pro_city	= req.body.land_city;
		var pro_sarvo	= req.body.land_sarve;
		var pro_plot	= req.body.land_plot;
		
		var ref = db.collection("users").doc(req.session.email).collection("Properties").doc(pro_name)
		.set({"Property_name":pro_name,"Property_address":pro_address,
		"Property_price":pro_price,"Property_proof":fileName,"Property_state":pro_state,
		"Property_city":pro_city,"Property_sarve":pro_sarvo,"Property_plot":pro_plot}).then((result) => {
			
		}).catch((err) => {
			console.log(err);
		});
	}catch(err) {
		console.log(err);
	}
	res.render("createProperty");
});

app.get("/logout", (req, res) => {
	req.session.destroy();
	res.redirect("/");
});

app.get("/forget_password",(req,res) => {
	res.render("forget_pass");
});

app.post("/forget_password",(req,res) => {
	try{
		var email = req.body.email;

		firebase.auth().sendPasswordResetEmail(email).then((result)=>{
			res.write(
				'<script>window.alert("Email sent Successfully");window.location="/";</script>'
			  );
		}).catch((err) => {
			res.write(
				'<script>window.alert("Email not sent");window.location="/";</script>'
			  );
		});
		
	}catch(err) {
		console.log(err);
		res.redirect("/forget_password");
	}
	
});

app.get("/reset_password",(req,res) => {
	res.render("reset_pass");
});

app.get("/account",(req,res) => {

if(req.session.phone && req.session.email){
	db.collection("users").where('Email','==', req.session.email).get().then((snapshot) => {
					snapshot.docs.forEach(doc => {

						res.render("account",{email:doc.data().Email,name:doc.data().Full_Name,
							mobile:doc.data().Mobile,address:doc.data().address
								});
					});
				}).catch((err) => {
					res.write("Some error Occured");
				});
}else if(req.session.phone){
	res.redirect("/verify_otp");
}else{
	res.redirect("/login");
}

});

app.post("/account",(req,res) => {
	try{
		var name = req.body.name;
		var mobile = req.body.mobile;
		db.collection("users").doc(req.session.email).update({"Full_Name":name,"Mobile":mobile}).
		then((err) => {
			res.write(
      '<script>window.alert("Updated Successfully");window.location="/";</script>'
    );
		}).catch((err) => res.write("some error Occured"));
	}catch(err) {
		res.write("Some error Occured");
	}
});

app.get("/search",async(req,res) => {

var obj = [];
let eventProducerRef = db.collection('users')
	eventProducerRef.get().then(
  producer => {
    producer.forEach(snapshot => {
      const docRef = eventProducerRef.doc(snapshot.id);
      const subcollection = docRef.collection('Properties')
      subcollection.get().then((query) => {
      	query.forEach(doc => {
      		obj.push(doc.data());
      	});
      });
      
    });
   
  });
setTimeout(()=> {
			res.render("search_prop",{object:obj});
		},5000);

}); 

app.get("*",(req,res)=>{
	res.render("404");
});

app.listen(port, () => {
	console.log(`running on port ${port}`);
});

function sendmessage(num) {
	num = '+91'+num;
	num = String(num);
	client.messages
      .create({body: 'Hi Your Land Otp is '+otp,
       from: '+17143846011', 
       to: num})
      .then( (message) => {
      	console.log(message.sid)
      	return true;
      })
      .catch(err => console.log(err));
}