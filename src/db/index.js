import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

 const connect= async () => {
    
        try {
            const mongoose_DB_connect= await mongoose.connect(`${process.env.MONGODB_URI}`);
            console.log(`\n Connected to the MongoDB :${mongoose_DB_connect.connection.host}\n`);
        } catch (error) {
         console.log(error);
         error.message='Failed to connect to MongoDB';
         process.exit(1); 
        }
    
}

export default connect