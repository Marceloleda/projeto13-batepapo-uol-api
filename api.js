import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import joi from 'joi';
import dayjs from 'dayjs';



dotenv.config()
const api = express()
api.use(cors())
api.use(express.json())

const mongoClient = new MongoClient(process.env.DATABASE_URL);
let db;

mongoClient.connect().then(()=>{
    console.log("mongoDB connected");
    db = mongoClient.db('batepapouol')
})

const userSchema = joi.object({
    name: joi.string().required()
})
const messageSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().valid("message", "private_message").required()
})

api.post("/participants", async (req, res)=>{
    const {name} = req.body;
    const validation = userSchema.validate({name}, {abortEarly: false})
    try{
        if(validation.error){
            return res.sendStatus(422)
        }
        const existNome = await db.collection("participants").findOne({name})

        if(existNome){
            return res.sendStatus(409)
        }

        await db.collection("participants").insertOne({
            name,
            lastStatus: Date.now()
        })
        await db.collection("messages").insertOne({
            from: name, 
            to: 'Todos', 
            text: 'entra na sala...', 
            type: 'status', 
            time: dayjs().format("HH:mm:ss")
        })
        res.status(201).send("Created")
    }catch(error){
        res.status(422).send(error.message)
    }
})
api.get("/participants", async (req, res)=>{
    try{
        const participantes = await db.collection("participants").find().toArray()
        res.send(participantes).status(200)
    }catch(error){
        res.status(422).send(error.message) 
    }
})
api.post("/messages", async (req,res)=>{
    const {to, text, type} = req.body;
    const {User} = req.headers;

    const validation = messageSchema.validate({to, text, type}, {abortEarly: false}) 
    if(validation.error){
        return res.sendStatus(422)
    }
    const exist = await db.collection('participants').findOne({User})
    if(exist){
        res.status(409).send("igual")
        return
    }


})



api.listen(process.env.PORT, ()=>console.log("listening on port 5000"));