import mongoose from "mongoose";

const topicSchema = new mongoose.Schema({
  subjectId:{
    type: mongoose.Schema.Types.ObjectId,
    required:true,
    ref:'Subject'
  },

  name:{
    type:String,
    required:true
  },

  order:{
    type:Number,
    required:true
  }
},{timestamps:true});

export const Topic = mongoose.model("Topic" , topicSchema);