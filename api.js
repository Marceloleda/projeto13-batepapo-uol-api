import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {MongoClient} from 'mongodb'
import joi from 'joi';
import dayjs from 'dayjs';

dotenv.config()
const api = express();
api.use(cors());
api.use(express.json())

const mongoClient = new MongoClient(process.env.MONGO_URI)

let db;

mongoClient.connect().then(()=>{
    db = mongoClient.db('batepapouol')
})

const nameSchema = joi.object({
    name: joi.string().pattern(/^[A-Za-záàâãéèêíïóôõöúçñÁÀÂÃÉÈÍÏÓÔÕÖÚÇÑ ]+$/).required()
})
const messageSchema = joi.object({
    to: joi.string().pattern(/^[A-Za-záàâãéèêíïóôõöúçñÁÀÂÃÉÈÍÏÓÔÕÖÚÇÑ ]+$/).required(),
    text: joi.string().pattern(/^[A-Za-záàâãéèêíïóôõöúçñÁÀÂÃÉÈÍÏÓÔÕÖÚÇÑ ]+$/).required(),
    type: joi.string().valid("message", "private_message").required()
})

api.post("/participants", async(req, res)=>{
    const {name} = req.body;
    const validation = nameSchema.validate(req.body)

    try{
        if(validation.error){
            res.status(422).send(validation.error.details)
            return
        }
        
        const igual = await db.collection('participantes').findOne({name})
        if(igual){
            res.status(409).send("igual")
            return
        }

        await db.collection('participantes').insertOne({
            name,
            lastStatus: Date.now()
            
        })

        await db.collection('mensagens').insertOne({
            from: name,
            to: "Todos",
            text: "entra na sala...",
            type: 'status',
            time: dayjs().format("HH:mm:ss")
        })
        res.status(201).send("Created")

    }
    catch(error){
        res.status(402).send(error.message)
    }
})

api.get('/participants', async(req, res)=>{
    try{
        const usuarios = await db.collection('participantes').find().toArray()
        res.send(usuarios)
    }
    catch(error){
        res.status(402).send(error.message)
        return
    }
})

api.post('/messages', async(req,res)=>{
    const {from, to, text, type} = req.body;
    const user = req.headers.user;
    const validation = messageSchema.validate(req.body) 
    try{
        if(validation.error){
            res.status(422).send(validation.error.details)
            return
        }
        const participantExist = await db.collection('participantes').findOne({name: user})
        if(!participantExist){
            res.status(409).send("participante nao existe")
            return
        }
        await db.collection('mensagens').insertOne({
            from: user,
            to,
            text,
            type,
            time: dayjs().format("HH:mm:ss")
        })
        res.status(201).send(participantExist)

    }
    catch(error){
        res.status(422).send(error.message)
        return
    }
})

api.get("/messages", async(req,res)=>{
    try{
        const messages = await db.collection('mensagens').find().toArray()
        res.status(200).send(messages)
    }
    catch(error){
        res.status(422).send(error.message)
        return
    }
})


api.listen(5000, console.log("listening in port 5000"))