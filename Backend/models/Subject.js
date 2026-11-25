import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema({
   name:{
    type:String,
    required:true,
    trim:true
   },

   code:{
    type:String,
    required:true,
    unique:true
   },

   department:{
    type:String,
    required:true
   },

   year:{
    type:Number,
    required:true
   },

   allowedSemesters: {
    type: [Number],
    default: function() {
      // Default to program semesters based on year: Year 1 => [1, 2], Year 2 => [3, 4], Year 3 => [5, 6], Year 4 => [7, 8]
      const y = this.year || 1;
      return [(y - 1) * 2 + 1, (y - 1) * 2 + 2];
    },
    validate: {
      validator: function(v) {
        return Array.isArray(v) && v.length > 0 && v.every(sem => sem >= 1 && sem <= 8);
      },
      message: "allowedSemesters must contain at least one valid semester number between 1 and 8"
    }
   }
},{timestamps:true});

export const Subject =  mongoose.model("Subject" , subjectSchema);