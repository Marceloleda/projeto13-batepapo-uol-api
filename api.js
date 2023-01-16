import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
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
const limitSchema = joi.object({
    limit: joi.string()
})
const messageSchema = joi.object({
    to: joi.string().min(1).required(),
    text: joi.string().min(1).required(),
    type: joi.string().valid("message", "private_message").required(),
    user: joi.string().min(1).required()
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
        return res.status(422).send(error.message)
    }
})
api.get("/participants", async (req, res)=>{
    try{
        const participantes = await db.collection("participants").find().toArray()
        res.send(participantes).status(200)
    }catch(error){
        return res.status(422).send(error.message) 
    }
})
api.post("/messages", async (req,res)=>{
    const {to, text, type} = req.body;
    const {user} = req.headers
    const validation = messageSchema.validate({to, text, type, user}, {abortEarly: false}) 
    const exist = await db.collection('participants').findOne({name: user})

    try{
        if(validation.error){
            return res.sendStatus(422)
        }
        if(!exist){
            res.sendStatus(422)
            return
        }
        await db.collection('messages').insertOne({
            from: user,
            to,
            text,
            type,
            time: dayjs().format("HH:mm:ss")
        })
    }catch(error){
        return res.status(422).send(error.message)
    }
    
    res.sendStatus(201)


})
api.get("/messages", async (req,res)=>{
    const limit = parseInt(req.query.limit)
    const {user} = req.headers
    const validation = userSchema.validate(limit, {abortEarly: false})

    try{

        const messages = await db.collection("messages").find({}).toArray()
        
        const permitMessages = messages.filter(value=>(
            value.from === user || value.to === user ||
            value.to === "Todos" || value.type === "messages"
        ));

        res.status(200).send((!limit) ? (permitMessages) : (permitMessages.reverse().slice(-limit)));
    }catch(error){
        console.log(error)
        return res.status(422).send(error.message)

    }
})
api.post("/status", async (req, res) => {
    const { user } = req.headers;
  
    try {
        if(!user){
          return res.sendStatus(422)
        }
      const participant = await db.collection("participants").findOne({ name: user });
  
      if (!participant) {
        res.sendStatus(404)
        return;
      }
      await db.collection("participants").updateOne({ name: user }, { $set: { lastStatus: Date.now()}});
      res.sendStatus(200);

    } catch (error) {
      res.status(422).send(error.message);
      return
    }
  });

  setInterval(async ()=>{
    const time = Date.now() - 10 * 1000;
    try{
        const saiParticipant = await db.collection("participants").find({
            lastStatus: { $lte: time }
        }).toArray();
        if(saiParticipant.length > 0){
            const enviaMessages = saiParticipant.map(
                (desloga)=>{
                    return{
                        from: desloga.name,
                        to: "Todos",
                        text: "sai da sala...",
                        type: "status",
                        time: dayjs().format("HH:mm:ss"),
                    }
                }
            )
            await db.collection("messages").insertMany(enviaMessages)
            await db.collection("participants").deleteOne({lastStatus: {$lte: time}});
        }
    }catch(error){
        return res.status(500).send(error.message);
    }
  }, 15000)

  api.delete("/messages/:id", async (req, res)=>{
    const {user} = req.headers;
    const {id} = req.params;
    try{
        const existMessage = await db.collection("messages").findOne({_id: ObjectId(id)})
        if(!existMessage){
            return res.sendStatus(404)
        }
        if(user !== existMessage.from){
            return res.sendStatus(401)
        }
        await db.collection("messages").deleteOne({
            _id: existMessage._id
        })
        res.sendStatus(200)
    }catch(error){
        return res.sendStatus(401).send(error.message);
    }
  })


api.listen(process.env.PORT, ()=>console.log(`listening on port ${process.env.PORT}`));