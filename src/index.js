import dotenv from "dotenv"
import connect from "./db/index.js"
import app from "./app.js";



dotenv.config({
    path:'./.env'
    
});

connect()
.then(()=>{
      app.listen(process.env.PORT||4000,()=>{
        console.log(`Server is running on port ${process.env.PORT}`);
      })
})
.catch((err)=>{
    app.on('error',(err)=>{
       console.log(err);
    })
    console.log(err);
    process.exit(1);
    
})