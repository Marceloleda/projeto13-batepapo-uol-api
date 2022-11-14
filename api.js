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
    to: Joi.string().pattern(/^[A-Za-záàâãéèêíïóôõöúçñÁÀÂÃÉÈÍÏÓÔÕÖÚÇÑ ]+$/).required(),
    text: Joi.string().pattern(/^[A-Za-záàâãéèêíïóôõöúçñÁÀÂÃÉÈÍÏÓÔÕÖÚÇÑ ]+$/).required(),
    type: Joi.string().valid("message", "private_message").required(),
    time: Joi.string(),
})

api.post("/participants", async(req, res)=>{
    const {name} = req.body;
    const validation = nameSchema.validate(req.body)
    const{from, to, text, type, time} = req.body;


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

        await db.collection('mensagem').insertOne({
            from,
            to,
            text,
            type,
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
        console.log(usuarios)
        res.send(usuarios)
    }
    catch(error){
        res.status(402).send(error.message)
        return
    }
})

api.post('/messages', async(req,res)=>{
    const {to, text, type} = req.body;
    const {User} = req.headers;
    try{

    }
    catch(error){
        res.status(422).send(error.message)
        return
    }
})


api.listen(5000, console.log("listening in port 5000"))