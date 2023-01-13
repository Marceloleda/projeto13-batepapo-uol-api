import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { MongoClient, MongoClient } from 'mongodb';
import { Console } from 'console';

dotenv.config()

const MongoClient = new MongoClient(process.env.DATABASE_URL);
let db;

const api = express()
api.use(cors())
api.use(express.json())


const PORT = 5000;

api.listen(PORT, ()=>console.log("lestening on port 5000"));