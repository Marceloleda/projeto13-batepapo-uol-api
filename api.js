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
    const {to, text, type} = req.body;
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
    const limit = parseInt(req.query.limit)
    const user = req.headers.user
    
    try{
        const messages = await db.collection('mensagens').find({}).toArray()
        const permit_messages = messages.filter(valor => (
            valor.from === user ||
            valor.to === user ||
            valor.to === "Todos" ||
			valor.type === "messages"        
        ))
        res.status(200).send((!limit) ? (permit_messages) : (permit_messages.slice(-limit)));

    }
    catch(error){
        res.status(422).send(error.message)
        return
    }
})
api.post("/status", async (req, res) => {
    const { user } = req.headers;
  
    try {
      const participant = await db.collection("participantes").findOne({ name: user });
  
      if (!participant) {
        res.status(404).send("usuario nao cadastrado");
        return;
      }
      await db.collection("participantes").updateOne({ name: user }, { $set: { lastStatus: Date.now()}});
      res.sendStatus(200);

    } catch (error) {
      res.status(500).send(error.message);
      return
    }
  });


setInterval(async () => {
    const time = Date.now() - 10 * 1000; 
    console.log(time);
    try {
      const participant_off = await db.collection("participantes").find({ lastStatus: { $lte: time } }) .toArray();

      if (participant_off.length > 0) {
        const menssages_off = participant_off.map(
          (participant_off) => {
            return {
              from: participant_off.name,
              to: "Todos",
              text: "sai da sala...",
              type: "status",
              time: dayjs().format("HH:mm:ss"),
            };
          }
        );
  
        await db.collection("mensagens").insertMany(menssages_off);
        await db.collection("participantes").deleteOne({ lastStatus: { $lte: time } });
      }
    } catch (error) {
      res.status(500).send(error.message);
      return
    }
  }, 150000);
          


api.listen(5000, console.log("listening in port 5000"))
