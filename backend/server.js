require("dotenv").config();
const express=require("express"),cors=require("cors"),bcrypt=require("bcrypt"),jwt=require("jsonwebtoken"),{Pool}=require("pg");
const app=express();app.use(cors({origin:["https://mr04nazmul.github.io","http://localhost:3000","http://localhost:5500"],methods:["GET","POST","OPTIONS"],allowedHeaders:["Content-Type","Authorization"]}));app.use(express.json({limit:"20kb"}));app.use(express.urlencoded({extended:false,limit:"20kb"}));
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.NODE_ENV==="production"?{rejectUnauthorized:false}:false});
const SECRET=process.env.JWT_SECRET;if(!SECRET) console.warn("JWT_SECRET is not set");

async function initDb(){
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      points BIGINT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
  `);
  console.log("PostgreSQL users table ready");
}

function auth(req,res,next){try{const h=req.headers.authorization||"";const token=h.startsWith("Bearer ")?h.slice(7):null;if(!token) return res.status(401).json({message:"Authentication required"});req.user=jwt.verify(token,SECRET);next()}catch{return res.status(401).json({message:"Invalid or expired token"})}}

app.get("/api/health",async(req,res)=>{try{await pool.query("SELECT 1");res.json({ok:true,service:"nazu-api",database:"connected"})}catch{res.status(503).json({ok:false,database:"unavailable"})}});

app.post("/api/register",async(req,res)=>{try{const email=String(req.body.email||"").trim().toLowerCase(),password=String(req.body.password||"");if(!/^\S+@\S+\.\S+$/.test(email)||password.length<8)return res.status(400).json({message:"Valid email and password of at least 8 characters required"});const hash=await bcrypt.hash(password,12);const q=await pool.query("INSERT INTO users(email,password_hash) VALUES($1,$2) RETURNING id,email,points,created_at",[email,hash]);res.status(201).json({user:q.rows[0]})}catch(e){if(e.code==="23505")return res.status(409).json({message:"Account already exists"});res.status(500).json({message:"Registration failed"})}});

app.post("/api/login",async(req,res)=>{try{const email=String(req.body.email||"").trim().toLowerCase(),password=String(req.body.password||"");const q=await pool.query("SELECT id,email,password_hash,points FROM users WHERE email=$1",[email]);if(!q.rowCount||!(await bcrypt.compare(password,q.rows[0].password_hash)))return res.status(401).json({message:"Invalid email or password"});const u=q.rows[0],token=jwt.sign({sub:u.id,email:u.email},SECRET,{expiresIn:"7d"});res.json({token,user:{id:u.id,email:u.email,points:u.points}})}catch{res.status(500).json({message:"Login failed"})}});

app.get("/api/me",auth,async(req,res)=>{const q=await pool.query("SELECT id,email,points,created_at FROM users WHERE id=$1",[req.user.sub]);if(!q.rowCount)return res.status(404).json({message:"User not found"});res.json({user:q.rows[0]})});

initDb().then(()=>app.listen(process.env.PORT||3000,()=>console.log("NAZU API running"))).catch(err=>{console.error("Database initialization failed",err);process.exit(1)});
